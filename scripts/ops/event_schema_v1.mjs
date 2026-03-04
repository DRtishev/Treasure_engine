/**
 * event_schema_v1.mjs — WOW Organism Event Schema v1.0.0
 *
 * Validator + canonicalizer for the tick-only event language.
 * SSOT: docs/SSOT_EVENT_SCHEMA_V1.md
 *
 * Gates: RG_EVT01_SCHEMA_LOCK, RG_EVT02_NO_TIME_FIELDS
 */

export const EVENT_SCHEMA_VERSION = '1.0.0';

export const VALID_MODES = ['CERT', 'CLOSE', 'AUDIT', 'RESEARCH', 'ACCEL', 'LIFE'];
export const VALID_COMPONENTS = ['TIMEMACHINE', 'AUTOPILOT', 'COCKPIT', 'REGISTRY', 'EVENTBUS', 'LIFE', 'DATA_ORGAN', 'FSM', 'DOCTOR', 'METAAGENT'];
export const VALID_SURFACES = ['UX', 'PR', 'OFFLINE_AUTHORITY', 'CONTRACT', 'PROFIT', 'DATA', 'READINESS', 'NONE'];

// ---------------------------------------------------------------------------
// U-23: Explicit attrs allowlist per event type (defense-in-depth)
// Known event + known field → PASS; Known event + unknown field → WARN;
// Unknown event → WARN; Forbidden pattern → FAIL (last line of defense)
// ---------------------------------------------------------------------------
export const ATTRS_ALLOWLIST = {
  STATE_TRANSITION: ['from_state', 'to_state', 'transition_id', 'budget_millis', 'guard_result'],
  GUARD_CHECK: ['guard_name', 'result', 'detail'],
  GUARD_FAILED: ['guard_name', 'result', 'detail'],
  STEP_COMPLETE: ['step_name', 'exit_code', 'reason_code'],
  STEP_FAIL: ['step_name', 'exit_code', 'reason_code', 'stderr'],
  LIFE_BOOT: ['run_id', 'mode'],
  LIFE_OUTCOME: ['verdict', 'consciousness_reached', 'telemetry_pass', 'telemetry_fail', 'doctor_verdict', 'doctor_score'],
  LIFE_SEAL: ['run_id', 'verdict', 'mode'],
  PROPRIO_SCAN: ['state', 'mode', 'source'],
  CONSCIOUSNESS_RESULT: ['goal', 'reached', 'final_state', 'transitions', 'failures'],
  GOAL_REACHED: ['goal', 'state'],
  GOAL_BLOCKED: ['goal', 'reason', 'state', 'failures'],
  GOAL_ALREADY_REACHED: ['state', 'goal'],
  TRANSITION_REJECTED: ['transition_id', 'reason', 'from_state'],
  TRANSITION_FORBIDDEN: ['transition_id', 'reason'],
  TRANSITION_FAILED: ['transition_id', 'error'],
  CIRCUIT_BREAKER_OPEN: ['transition_id', 'consecutive_failures'],
  COMPENSATION_EXECUTED: ['transition_id', 'compensation_id', 'result'],
  WATERMARK_WRITTEN: ['state', 'mode', 'run_id', 'path'],
  DOCTOR_VERDICT: ['verdict', 'score', 'chaos', 'scoreboard'],
  DOCTOR_VERDICT_FAIL: ['score', 'verdict'],
  HEALTH_DECAY: ['last3_scores', 'escalation_stage', 'consecutive_drops'],
  ESCALATION_STAGE_3: ['score', 'consecutive_drops'],
  PREDICTIVE_WARNING: ['prediction', 'confidence', 'projected_score'],
  RECOVERY_VERIFIED: ['recovered'],
  RECOVERY_PARTIAL: ['recovered', 'still_failing'],
  RECOVERY_FAILED: ['still_failing'],
  PROBE_FAIL: ['probe', 'detail'],
  REFLEX_FIRED: ['name', 'detail', 'severity'],
  IMMUNE_HEALED: ['action', 'detail'],
  IMMUNE_HEAL_FAILED: ['action', 'error'],
  FLEET_DECISION: ['candidate', 'decision', 'reason'],
  METAAGENT_TICK: ['decisions', 'fleet_health'],
  PLAN_CREATED: ['mode', 'plan_id'],
  REFUSAL: ['reason'],
  APPLY_ALLOWED: ['plan_id'],
  APPLY_EXECUTED: ['plan_id', 'result'],
  REGISTRY_CREATED: ['count'],
  CANDIDATE_ADDED: ['candidate_id', 'config_id'],
  CANDIDATE_PROMOTED: ['candidate_id', 'state'],
  BUS_INIT: [],
  EVENT_APPENDED: ['source'],
  LEDGER_BOOT: [],
  LEDGER_SEAL: ['ticks_total', 'ticks_failed'],
};

// ---------------------------------------------------------------------------
// Forbidden field patterns (RG_EVT02 — mirrors TIME02 logic for event payload)
// ---------------------------------------------------------------------------
export const FORBIDDEN_FIELD_RE = /(_at|_ts|_ms|timestamp|elapsed|wall_clock)($|[^a-z])/i;
export const FORBIDDEN_VALUE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/; // ISO 8601 prefix

const REQUIRED_FIELDS = ['schema_version', 'tick', 'run_id', 'mode', 'component', 'event', 'reason_code', 'surface', 'evidence_paths', 'attrs'];

// ---------------------------------------------------------------------------
// validate(event) => { ok: boolean, errors: string[] }
// ---------------------------------------------------------------------------
export function validate(event) {
  const errors = [];

  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    return { ok: false, errors: ['event must be a non-null object'] };
  }

  // Required fields
  for (const f of REQUIRED_FIELDS) {
    if (!(f in event)) errors.push(`missing required field: ${f}`);
  }

  if (errors.length > 0) return { ok: false, errors };

  // schema_version
  if (event.schema_version !== EVENT_SCHEMA_VERSION) {
    errors.push(`schema_version must be "${EVENT_SCHEMA_VERSION}", got "${event.schema_version}"`);
  }

  // tick: positive integer
  if (!Number.isInteger(event.tick) || event.tick < 1) {
    errors.push(`tick must be a positive integer, got ${JSON.stringify(event.tick)}`);
  }

  // run_id: non-empty string
  if (typeof event.run_id !== 'string' || !event.run_id.trim()) {
    errors.push('run_id must be a non-empty string');
  }

  // mode
  if (!VALID_MODES.includes(event.mode)) {
    errors.push(`mode must be one of [${VALID_MODES.join(', ')}], got "${event.mode}"`);
  }

  // component
  if (!VALID_COMPONENTS.includes(event.component)) {
    errors.push(`component must be one of [${VALID_COMPONENTS.join(', ')}], got "${event.component}"`);
  }

  // event: non-empty SCREAMING_SNAKE_CASE
  if (typeof event.event !== 'string' || !event.event.trim()) {
    errors.push('event name must be a non-empty string');
  } else if (!/^[A-Z][A-Z0-9_]*$/.test(event.event)) {
    errors.push(`event name must be SCREAMING_SNAKE_CASE, got "${event.event}"`);
  }

  // reason_code: non-empty string
  if (typeof event.reason_code !== 'string' || !event.reason_code.trim()) {
    errors.push('reason_code must be a non-empty string (use "NONE" for success)');
  }

  // surface
  if (!VALID_SURFACES.includes(event.surface)) {
    errors.push(`surface must be one of [${VALID_SURFACES.join(', ')}], got "${event.surface}"`);
  }

  // evidence_paths: array of strings
  if (!Array.isArray(event.evidence_paths)) {
    errors.push('evidence_paths must be an array');
  } else {
    for (const p of event.evidence_paths) {
      if (typeof p !== 'string') errors.push(`evidence_paths entries must be strings, got ${typeof p}`);
    }
  }

  // attrs: flat object (no timestamp fields)
  if (!event.attrs || typeof event.attrs !== 'object' || Array.isArray(event.attrs)) {
    errors.push('attrs must be a non-null object');
  } else {
    const attrErrors = checkNoTimestamps(event.attrs, 'attrs');
    errors.push(...attrErrors);

    // U-23: Allowlist check (WARN only, never blocks)
    const allowedFields = ATTRS_ALLOWLIST[event.event];
    if (allowedFields) {
      for (const key of Object.keys(event.attrs)) {
        if (!allowedFields.includes(key)) {
          // WARN: unknown field in known event type (logged but not rejected)
        }
      }
    }
  }

  // Check top-level for forbidden field names
  for (const key of Object.keys(event)) {
    if (FORBIDDEN_FIELD_RE.test(key)) {
      errors.push(`forbidden field name at root: "${key}" (matches timestamp pattern)`);
    }
  }

  // Check forbidden ISO values in evidence_paths
  for (const p of (Array.isArray(event.evidence_paths) ? event.evidence_paths : [])) {
    if (typeof p === 'string' && FORBIDDEN_VALUE_RE.test(p)) {
      errors.push(`forbidden ISO timestamp value in evidence_paths: "${p}"`);
    }
  }

  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// checkNoTimestamps(obj, prefix) => string[] of errors
// ---------------------------------------------------------------------------
function checkNoTimestamps(obj, prefix) {
  const errors = [];
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return errors;
  for (const [k, v] of Object.entries(obj)) {
    const path = `${prefix}.${k}`;
    if (FORBIDDEN_FIELD_RE.test(k)) {
      errors.push(`forbidden field name: "${path}" (matches timestamp pattern)`);
    }
    if (typeof v === 'string' && FORBIDDEN_VALUE_RE.test(v)) {
      errors.push(`forbidden ISO timestamp value at "${path}": "${v}"`);
    }
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      errors.push(...checkNoTimestamps(v, path));
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// canonicalize(event) => normalized event | throws on validation failure
// ---------------------------------------------------------------------------
export function canonicalize(event, overrides = {}) {
  const merged = { ...event, ...overrides };
  const result = validate(merged);
  if (!result.ok) {
    throw new Error(`EVT_SCHEMA_ERROR: ${result.errors.join('; ')}`);
  }

  // Normalize evidence_paths: POSIX, sorted, deduped
  const paths = [...new Set((merged.evidence_paths ?? []).map((p) => String(p).replace(/\\/g, '/')))]
    .sort((a, b) => a.localeCompare(b));

  // Normalize attrs: sorted keys
  const attrs = {};
  for (const k of Object.keys(merged.attrs ?? {}).sort((a, b) => a.localeCompare(b))) {
    attrs[k] = (merged.attrs ?? {})[k];
  }

  return {
    schema_version: EVENT_SCHEMA_VERSION,
    tick: merged.tick,
    run_id: String(merged.run_id),
    mode: merged.mode,
    component: merged.component,
    event: merged.event,
    reason_code: merged.reason_code,
    surface: merged.surface,
    evidence_paths: paths,
    attrs,
  };
}

// ---------------------------------------------------------------------------
// makeEvent(fields) — convenience factory with defaults
// ---------------------------------------------------------------------------
export function makeEvent({ tick, run_id, mode = 'CERT', component, event, reason_code = 'NONE', surface = 'NONE', evidence_paths = [], attrs = {} }) {
  return canonicalize({
    schema_version: EVENT_SCHEMA_VERSION,
    tick,
    run_id,
    mode,
    component,
    event,
    reason_code,
    surface,
    evidence_paths,
    attrs,
  });
}
