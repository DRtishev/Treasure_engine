/**
 * data_organ/event_emitter.mjs — Data-Organ R1 Event Emission Helpers
 *
 * Provides emitAcqEvent and emitReplayEvent for solder point into WOW Organism.
 * All events conform to Event Schema v1 (tick-only, no time fields).
 * Component: DATA_ORGAN (VALID_COMPONENTS member).
 *
 * Event types emitted by replay:
 *   REPLAY_BOOT    — replay started, provider validated
 *   REPLAY_APPLY   — raw rows loaded + SHA verified
 *   REPLAY_DEDUP   — duplicate detection complete (rows counted)
 *   REPLAY_REORDER — tick order confirmed
 *   REPLAY_SEAL    — normalized hash verified, replay complete
 *
 * Event types emitted by acquire:
 *   ACQ_START      — acquire initiated (requires double-key)
 *   ACQ_COMPLETE   — acquire succeeded (lock written)
 *   ACQ_BLOCKED    — acquire blocked (missing double-key or network error)
 *
 * Gates: RG_DATA_EVT01_EVENT_EMISSION
 * Write-scope (R5): reports/evidence/EPOCH-EVENTBUS-REPLAY-<run_id>/
 */

import { createBus } from '../../ops/eventbus_v1.mjs';

const COMPONENT = 'DATA_ORGAN';
const MODE = 'CERT';

/**
 * Create an EventBus for a replay run.
 * epochDir is deterministically derived from runId (no mtime).
 * @param {string} runId
 * @param {string} [epochDir] — optional override for test isolation
 */
export function createReplayBus(runId, epochDir = null) {
  return createBus(runId, epochDir);
}

/**
 * Emit REPLAY_BOOT — replay started, provider validated.
 * @param {object} bus — EventBus instance from createReplayBus
 * @param {object} opts
 * @param {string} opts.provider — provider_id
 * @param {string} opts.schema_version — schema version string
 */
export function emitReplayBoot(bus, { provider, schema_version }) {
  return bus.append({
    mode: MODE,
    component: COMPONENT,
    event: 'REPLAY_BOOT',
    reason_code: 'NONE',
    surface: 'DATA',
    evidence_paths: [],
    attrs: { provider, schema_version },
  });
}

/**
 * Emit REPLAY_APPLY — raw rows loaded and SHA verified.
 * @param {object} bus
 * @param {object} opts
 * @param {string} opts.provider
 * @param {number} opts.rows_n — number of raw rows
 * @param {string} opts.raw_sha256 — hex digest of raw content
 */
export function emitReplayApply(bus, { provider, rows_n, raw_sha256 }) {
  return bus.append({
    mode: MODE,
    component: COMPONENT,
    event: 'REPLAY_APPLY',
    reason_code: 'NONE',
    surface: 'DATA',
    evidence_paths: [],
    attrs: { provider, rows_n, raw_sha256_prefix: raw_sha256.slice(0, 16) },
  });
}

/**
 * Emit REPLAY_DEDUP — duplicate detection complete.
 * @param {object} bus
 * @param {object} opts
 * @param {string} opts.provider
 * @param {number} opts.rows_n — total rows
 * @param {number} opts.unique_n — unique rows after dedup
 */
export function emitReplayDedup(bus, { provider, rows_n, unique_n }) {
  return bus.append({
    mode: MODE,
    component: COMPONENT,
    event: 'REPLAY_DEDUP',
    reason_code: 'NONE',
    surface: 'DATA',
    evidence_paths: [],
    attrs: { provider, rows_n, unique_n },
  });
}

/**
 * Emit REPLAY_REORDER — tick order confirmed.
 * @param {object} bus
 * @param {object} opts
 * @param {string} opts.provider
 * @param {boolean} opts.ordered — true if ts is monotonically non-decreasing
 * @param {number} opts.rows_n
 */
export function emitReplayReorder(bus, { provider, ordered, rows_n }) {
  return bus.append({
    mode: MODE,
    component: COMPONENT,
    event: 'REPLAY_REORDER',
    reason_code: ordered ? 'NONE' : 'REORDER_DETECTED',
    surface: 'DATA',
    evidence_paths: [],
    attrs: { provider, ordered, rows_n },
  });
}

/**
 * Emit REPLAY_SEAL — normalized hash verified, replay complete.
 * @param {object} bus
 * @param {object} opts
 * @param {string} opts.provider
 * @param {string} opts.schema_version
 * @param {number} opts.rows_n
 * @param {string} opts.normalized_hash_prefix — first 16 chars of normalized_schema_sha256
 */
export function emitReplaySeal(bus, { provider, schema_version, rows_n, normalized_hash_prefix }) {
  return bus.append({
    mode: MODE,
    component: COMPONENT,
    event: 'REPLAY_SEAL',
    reason_code: 'NONE',
    surface: 'DATA',
    evidence_paths: [],
    attrs: { provider, schema_version, rows_n, normalized_hash_prefix },
  });
}

/**
 * Emit ACQ_START — acquire initiated (network-gated).
 * @param {object} bus
 * @param {object} opts
 * @param {string} opts.provider
 * @param {boolean} opts.double_key_present
 */
export function emitAcqEvent(bus, { provider, double_key_present, event = 'ACQ_START', reason_code = 'NONE' }) {
  return bus.append({
    mode: MODE,
    component: COMPONENT,
    event,
    reason_code,
    surface: 'DATA',
    evidence_paths: [],
    attrs: { provider, double_key_present },
  });
}
