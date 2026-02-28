# SSOT_EVENT_SCHEMA_V1.md — WOW Organism Event Schema

> Version: 1.0.0
> Status: LOCKED
> Gate: RG_EVT01_SCHEMA_LOCK + RG_EVT02_NO_TIME_FIELDS

---

## 1. PURPOSE

All WOW components (TimeMachine, Autopilot, Cockpit, Registry) speak ONE language:
deterministic, tick-ordered, timestamp-free events. This file is the
**single source of truth** for that language.

---

## 2. EVENT RECORD SHAPE

```json
{
  "schema_version": "1.0.0",
  "tick":           1,
  "run_id":         "abc123def456",
  "mode":           "CERT",
  "component":      "TIMEMACHINE",
  "event":          "HEARTBEAT",
  "reason_code":    "NONE",
  "surface":        "UX",
  "evidence_paths": ["reports/evidence/EPOCH-FOO/TIMELINE.jsonl"],
  "attrs":          {}
}
```

---

## 3. FIELD DEFINITIONS

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `schema_version` | string | YES | Always `"1.0.0"` |
| `tick` | integer ≥ 1 | YES | Monotonically increasing within a run; no gaps required |
| `run_id` | string | YES | Hex ID from git HEAD or TREASURE_RUN_ID env |
| `mode` | string | YES | One of: CERT, CLOSE, AUDIT, RESEARCH, ACCEL, LIFE |
| `component` | string | YES | One of: TIMEMACHINE, AUTOPILOT, COCKPIT, REGISTRY, EVENTBUS, LIFE |
| `event` | string | YES | SCREAMING_SNAKE_CASE event name |
| `reason_code` | string | YES | NONE if success; else registered reason code |
| `surface` | string | YES | UX, PR, OFFLINE_AUTHORITY, CONTRACT, PROFIT, DATA |
| `evidence_paths` | string[] | YES | Repo-relative POSIX paths; sorted; may be empty [] |
| `attrs` | object | YES | Flat key-value; no nested timestamps; may be {} |

---

## 4. FORBIDDEN FIELDS (RG_EVT02)

These field names are FORBIDDEN anywhere in the event record including inside `attrs`:

| Pattern | Examples |
|---------|---------|
| `*_at` | `started_at`, `completed_at`, `emitted_at` |
| `*_ts` | `event_ts`, `wall_ts` |
| `*_ms` | `elapsed_ms`, `duration_ms` |
| `timestamp*` | `timestamp`, `timestampMs` |
| `*date*` | `created_date` (note: `candidate` contains `date` — use `n_open` instead) |
| `elapsed*` | `elapsed`, `elapsed_sec` |
| `wall_clock*` | `wall_clock` |
| ISO 8601 values | `"2026-02-28T..."` as field values |

---

## 5. CANONICAL EVENT NAMES BY COMPONENT

### TIMEMACHINE
- `LEDGER_BOOT` — ledger script started
- `CHECK_PASS` — a tick-level check passed
- `CHECK_FAIL` — a tick-level check failed
- `LEDGER_SEAL` — all ticks complete

### AUTOPILOT
- `PLAN_CREATED` — dry-run plan written
- `REFUSAL` — action refused (reason_code set)
- `APPLY_ALLOWED` — double-key unlock verified, apply permitted
- `APPLY_EXECUTED` — apply action ran
- `MODE_ROUTED` — mode detection complete

### COCKPIT
- `HUD_RENDER_START` — cockpit started collecting
- `HUD_SECTION_READ` — a section collected from EventBus
- `HUD_COMPLETE` — HUD files written

### REGISTRY
- `SCAN_START` — registry scan started
- `CANDIDATE_FOUND` — candidate added from sweep
- `PROMOTE_REQUESTED` — --promote flag received
- `PROMOTE_EXECUTED` — candidate status changed to PROMOTED
- `PROMOTE_REFUSED` — promotion refused (reason_code set)
- `REGISTRY_SEALED` — REGISTRY.json written

### EVENTBUS
- `BUS_INIT` — bus initialized for this run
- `EVENT_APPENDED` — event written to stream

### LIFE
- `LIFE_START` — ops:life orchestration started
- `STEP_OK` — a life step completed successfully
- `STEP_FAIL` — a life step failed
- `LIFE_COMPLETE` — full life cycle done

---

## 6. ORDERING RULES

1. Events within a run are ordered by `tick` (ascending).
2. `tick` must be a positive integer; no floats.
3. On multi-component runs, ticks are assigned by component order:
   EVENTBUS → TIMEMACHINE → AUTOPILOT → COCKPIT → REGISTRY → LIFE
4. Within a component, ticks are assigned in declaration order.
5. Two runs with same inputs produce the same tick sequence (determinism ×2).

---

## 7. CANONICALIZATION RULES

1. `evidence_paths` sorted lexicographically, POSIX separators.
2. `attrs` keys sorted lexicographically.
3. JSON output via `writeJsonDeterministic` (schema_version required).
4. No `undefined` values — omit optional sub-fields by using `null`.

---

## 8. VALIDATOR CONTRACT (event_schema_v1.mjs)

```js
import { validate, canonicalize } from './event_schema_v1.mjs';
const result = validate(event);   // { ok: true } | { ok: false, errors: string[] }
const canon  = canonicalize(event); // throws if invalid; returns normalized event object
```

---

## 9. WRITE-SCOPE

| Location | Who writes | When |
|----------|-----------|------|
| `reports/evidence/EPOCH-EVENTBUS-<run_id>/EVENTS.jsonl` | EventBus | Each run |
| `reports/evidence/EXECUTOR/` | AUDIT gate scripts only | On gate runs |
| `artifacts/**` | ops scripts | As needed |

CERT mode writes ONLY to `EPOCH-*` dirs. EXECUTOR is AUDIT-only.
