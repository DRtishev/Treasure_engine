/**
 * data_organ_controller.mjs — Nested FSM for data lifecycle management
 *
 * EPOCH-74: Data Organ Liveness — Requirement R4
 *
 * States: DORMANT → ACQUIRING → ENRICHING → NOURISHING → STALE / STARVING
 *
 * Transitions:
 *   DT01: DORMANT    → ACQUIRING   (guard: double-key present)
 *   DT02: ACQUIRING  → ENRICHING   (guard: raw data sealed)
 *   DT03: ENRICHING  → NOURISHING  (guard: enriched bars valid)
 *   DT04: NOURISHING → STALE       (guard: freshness expired)
 *   DT05: STALE      → ACQUIRING   (guard: double-key present)
 *   DT06: ACQUIRING  → STARVING    (guard: acquire failed)
 *   DT07: STARVING   → DORMANT     (guard: network revoked)
 *   DT08: STALE      → ENRICHING   (guard: raw data newer)
 *
 * Exports:
 *   DataOrganController       — controller class
 *   DATA_ORGAN_STATES         — state definitions
 *   DATA_ORGAN_TRANSITIONS    — transition definitions
 *
 * Surface: DATA (offline, no net)
 */

export const DATA_ORGAN_STATES = {
  DORMANT: { description: 'No data, offline, awaiting ALLOW_NETWORK' },
  ACQUIRING: { description: 'Double-key active, WS connected, writing raw' },
  ENRICHING: { description: 'Offline, orderbook→bars, signals, validation' },
  NOURISHING: { description: 'Fresh bars available for strategies' },
  STARVING: { description: 'Acquire failed, no raw data at all' },
  STALE: { description: 'Data older than TTL, needs re-acquire' },
};

export const DATA_ORGAN_TRANSITIONS = {
  DT01_DORMANT_TO_ACQUIRING: { from: 'DORMANT', to: 'ACQUIRING', guard: 'guard_double_key_present' },
  DT02_ACQUIRING_TO_ENRICHING: { from: 'ACQUIRING', to: 'ENRICHING', guard: 'guard_raw_data_sealed' },
  DT03_ENRICHING_TO_NOURISHING: { from: 'ENRICHING', to: 'NOURISHING', guard: 'guard_enriched_bars_valid' },
  DT04_NOURISHING_TO_STALE: { from: 'NOURISHING', to: 'STALE', guard: 'guard_freshness_expired' },
  DT05_STALE_TO_ACQUIRING: { from: 'STALE', to: 'ACQUIRING', guard: 'guard_double_key_present' },
  DT06_ACQUIRING_TO_STARVING: { from: 'ACQUIRING', to: 'STARVING', guard: 'guard_acquire_failed' },
  DT07_STARVING_TO_DORMANT: { from: 'STARVING', to: 'DORMANT', guard: 'guard_network_revoked' },
  DT08_STALE_TO_ENRICHING: { from: 'STALE', to: 'ENRICHING', guard: 'guard_raw_data_newer' },
};

export class DataOrganController {
  /**
   * @param {object} bus — EventBus instance (or null for headless mode)
   */
  constructor(bus) {
    this.state = 'DORMANT';
    this.bus = bus;
    this.lastAcquireTick = 0;
    this.lastEnrichTick = 0;
    this.lastConsumeTick = 0;

    // Guard context — set externally before calling transition()
    this._guardContext = {
      double_key_present: false,
      raw_data_sealed: false,
      enriched_bars_valid: false,
      freshness_expired: false,
      acquire_failed: false,
      network_revoked: false,
      raw_data_newer: false,
    };
  }

  /**
   * Set guard context for transition evaluation.
   * @param {object} ctx — partial guard context fields
   */
  setGuardContext(ctx) {
    Object.assign(this._guardContext, ctx);
  }

  // Guard implementations
  guard_double_key_present() {
    return { pass: this._guardContext.double_key_present, detail: 'double-key check' };
  }

  guard_raw_data_sealed() {
    return { pass: this._guardContext.raw_data_sealed, detail: 'raw data seal check' };
  }

  guard_enriched_bars_valid() {
    return { pass: this._guardContext.enriched_bars_valid, detail: 'enriched bars validation' };
  }

  guard_freshness_expired() {
    return { pass: this._guardContext.freshness_expired, detail: 'freshness TTL check' };
  }

  guard_acquire_failed() {
    return { pass: this._guardContext.acquire_failed, detail: 'acquire failure check' };
  }

  guard_network_revoked() {
    return { pass: this._guardContext.network_revoked, detail: 'network revocation check' };
  }

  guard_raw_data_newer() {
    return { pass: this._guardContext.raw_data_newer, detail: 'raw data freshness check' };
  }

  /**
   * Attempt a state transition.
   * @param {string} transitionId — e.g. 'DT01_DORMANT_TO_ACQUIRING'
   * @returns {{ success: boolean, from?: string, to?: string, detail?: string }}
   */
  transition(transitionId) {
    const trans = DATA_ORGAN_TRANSITIONS[transitionId];
    if (!trans) return { success: false, detail: 'unknown transition' };

    // Validate current state matches transition source
    if (this.state !== trans.from) {
      return { success: false, detail: `state mismatch: current=${this.state} expected=${trans.from}` };
    }

    const guardFn = this[trans.guard];
    if (!guardFn) return { success: false, detail: `unknown guard: ${trans.guard}` };

    const guard = guardFn.call(this);
    if (!guard.pass) return { success: false, detail: guard.detail };

    const from = this.state;
    const to = trans.to;
    this.state = to;

    // Update tick counters
    const currentTick = this.bus ? (this.bus.summary?.().ticks_n ?? 0) : 0;
    if (to === 'ACQUIRING') this.lastAcquireTick = currentTick;
    if (to === 'ENRICHING') this.lastEnrichTick = currentTick;
    if (to === 'NOURISHING') this.lastConsumeTick = currentTick;

    // Emit EventBus event if bus available
    if (this.bus) {
      this.bus.append({
        mode: 'CERT',
        component: 'DATA_ORGAN',
        event: 'DATA_ORGAN_TRANSITION',
        reason_code: 'NONE',
        surface: 'DATA',
        evidence_paths: [],
        attrs: { from, to, transition: transitionId },
      });
    }

    return { success: true, from, to };
  }

  /**
   * Emit organism-level status event for FSM Brain consumption.
   * @returns {string} — event name (DATA_ALIVE, DATA_STALE, etc.)
   */
  emitStatus() {
    const event = {
      NOURISHING: 'DATA_ALIVE',
      STALE: 'DATA_STALE',
      STARVING: 'DATA_STARVING',
      DORMANT: 'DATA_DORMANT',
    }[this.state] || 'DATA_DORMANT';

    if (this.bus) {
      this.bus.append({
        mode: 'CERT',
        component: 'DATA_ORGAN',
        event,
        reason_code: 'NONE',
        surface: 'DATA',
        evidence_paths: [],
        attrs: {
          state: this.state,
          acquire_age_ticks: String((this.bus.summary?.().ticks_n ?? 0) - this.lastAcquireTick),
          enrich_age_ticks: String((this.bus.summary?.().ticks_n ?? 0) - this.lastEnrichTick),
        },
      });
    }

    return event;
  }

  /**
   * Produce a frozen scan object for proprioception.
   * @returns {object}
   */
  scan() {
    return Object.freeze({
      state: this.state,
      lastAcquireTick: this.lastAcquireTick,
      lastEnrichTick: this.lastEnrichTick,
      lastConsumeTick: this.lastConsumeTick,
      freshness: this.computeFreshness(),
    });
  }

  /**
   * Compute freshness status.
   * @returns {{ acquire_age: number, enrich_age: number, consume_age: number, status: string }}
   */
  computeFreshness() {
    const currentTick = this.bus ? (this.bus.summary?.().ticks_n ?? 0) : 0;
    return {
      acquire_age: currentTick - this.lastAcquireTick,
      enrich_age: currentTick - this.lastEnrichTick,
      consume_age: currentTick - this.lastConsumeTick,
      status: this.state === 'NOURISHING' ? 'FRESH'
        : this.state === 'STALE' ? 'STALE'
          : this.state === 'STARVING' ? 'DEAD'
            : 'UNKNOWN',
    };
  }
}
