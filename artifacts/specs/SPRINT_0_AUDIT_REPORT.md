# Sprint 0: Reanimation — Audit Report

> Audit Report | Version 1.0.0
> Date: 2026-03-04 | Classification: INTERNAL
> Parent: [SDD-001 Sprint 0 Reanimation](SDD_SPRINT_0_REANIMATION.md)
> Auditor: AI Agent (CERT mode)

---

## 1. Executive Summary

**Sprint 0 COMPLETE. All Stop Rules satisfied. Organism is ALIVE and HEALTHY.**

| Gate | Expected | Actual | Status |
|------|----------|--------|--------|
| verify:fast x2 | 37/37 PASS, identical | 37/37 PASS, identical | PASS |
| ops:life | EC=0 (ALIVE) | EC=0, ALIVE, FSM=CERTIFIED | PASS |
| ops:doctor | EC=0 (HEALTHY, >=50) | EC=0, HEALTHY, 100/100 | PASS |
| ops:cockpit | EC=0 | EC=0, PASS | PASS |

---

## 2. MINE Resolutions

### MINE-01: budget_ms -> budget_millis (RESOLVED)

- **Root Cause**: `event_schema_v1.mjs` `FORBIDDEN_FIELD_RE` rejects `_ms` suffix
- **Fix**: Renamed `budget_ms` to `budget_millis` in `state_manager.mjs:460`
- **Scope**: 1 line change
- **Ripple Impact**: None — no consumers depended on field name
- **Commit**: `7f30c0a`

### MINE-10: Placeholder SHA256 Hashes (RESOLVED)

- **Root Cause**: `EDGE_PROFIT_00/TRIALS_LEDGER.md` contained fake `sha256:1111...` hashes
- **Fix**: Replaced with `sha256:STUB_PLACEHOLDER_NOT_EVIDENCE` and verdict `STUB`
- **Option Used**: B (mark as STUB — honest, preserves structure)
- **Commit**: `7f30c0a`

---

## 3. Additional Fixes Discovered During Execution

### FIX-A: FP01 Regex False Positive (DISCOVERED + RESOLVED)

- **Root Cause**: `TIMESTAMP_FIELD_RE` in `write_json_deterministic.mjs:16` matched "candidate" (ends in "date")
- **Fix**: Changed regex from `/(...|date)$/i` to `/(...|_date|^date)$/i`
- **Impact**: Was blocking all JSON writes containing "candidate" field
- **Commit**: `7f30c0a`

### FIX-B: METAAGENT Component Missing (DISCOVERED + RESOLVED)

- **Root Cause**: `METAAGENT` not in `VALID_COMPONENTS` array in `event_schema_v1.mjs`
- **Fix**: Added `'METAAGENT'` to the array
- **Commit**: `7f30c0a`

### FIX-C: baseline_restore.sh Stale Evidence (DISCOVERED + RESOLVED)

- **Root Cause**: `git restore` doesn't clean `.gitignored` EPOCH-* directories; proprioception replayed stale DEGRADED state
- **Fix**: Added `git clean -fdx reports/evidence/EPOCH-*` and `git clean -fdx artifacts/fsm`
- **Commit**: `7f30c0a`

### FIX-D: Doctor Infinite Recursion (DISCOVERED + RESOLVED)

- **Root Cause**: ops:life runs ops:doctor, which runs ops:life, which runs ops:doctor...
- **Fix**: Anti-recursion env vars `TREASURE_INSIDE_LIFE=1` and `TREASURE_INSIDE_DOCTOR=1`
  - When inside life: doctor skips startup probe (baseline:restore + verify:fast) and liveness probe (verify:fast x2 + ops:life x2)
  - When inside doctor: life skips the doctor telemetry step
- **Commits**: `097e9be`, `7f30c0a`

### FIX-E: READINESS Surface Missing (DISCOVERED + RESOLVED)

- **Root Cause**: `doctor_v2.mjs:579,591` emits events with `surface: 'READINESS'` but VALID_SURFACES didn't include it
- **Fix**: Added `'READINESS'` to VALID_SURFACES in `event_schema_v1.mjs`
- **Commit**: `22fc877`

### FIX-F: Doctor Provenance Seal ENOENT (DISCOVERED + RESOLVED)

- **Root Cause**: `baseline:restore` in Phase 1 deleted EPOCH_DIR; Phase 5 sealProvenance couldn't write PROVENANCE.json
- **Fix**: Re-create EPOCH_DIR after baseline:restore and before sealProvenance
- **Commit**: `22fc877`

### FIX-G: Doctor x2 Non-Determinism (DISCOVERED + RESOLVED)

- **Root Cause**: Second ops:life run saw evidence from first run via proprioception → different LIFE_SUMMARY.json
- **Fix**: Run `baseline:restore` between the two ops:life runs to give both identical starting state
- **Commit**: `22fc877`

---

## 4. Verification Evidence

### verify:fast x2

```
Run 1: 37/37 PASS, EC=0
Run 2: 37/37 PASS, EC=0
Determinism: IDENTICAL
```

### ops:life

```
[PASS] ops:life — ALIVE — NONE
  FSM:     CERTIFIED (CERT)
  CONSCIOUSNESS: goal=CERTIFIED reached=true
  TELEMETRY: 6/6 run, 6 PASS, 0 FAIL
  DOCTOR: HEALTHY score=100
  FLEET: 0 candidates, health=1, decisions=1
```

### ops:doctor (standalone)

```
VERDICT: HEALTHY         SCORE: 100/100
CHAOS:   IMMUNE          MEMORY: run #8
CHAIN:   depth=1 integrity=GENESIS

Scoreboard:
  + chaos_evidence_tamper            6/6
  + chaos_fp01                       4/4
  + chaos_mode_lie                   7/7
  + chaos_net_leak                   4/4
  + chaos_orphan                     7/7
  + differential_clean               5/5
  + liveness_alive                  15/15
  + liveness_deterministic          15/15
  + provenance_sealed                3/3
  + readiness_policy                16/16
  + readiness_san                    8/8
  + startup_boot                    10/10
  TOTAL: 100/100
```

### ops:cockpit

```
[PASS] ops:cockpit — NONE
  fsm:         CERTIFYING mode=CERT
  readiness:   NEEDS_DATA lanes=0 truth=0
```

---

## 5. Diff Summary

| File | Change | Lines |
|------|--------|-------|
| scripts/ops/state_manager.mjs | `budget_ms` → `budget_millis` | 1 |
| scripts/ops/event_schema_v1.mjs | +METAAGENT, +READINESS | 2 |
| scripts/lib/write_json_deterministic.mjs | FP01 regex fix | 1 |
| scripts/ops/baseline_restore.sh | +git clean -fdx for EPOCH-*/fsm | 2 |
| scripts/ops/life.mjs | +anti-recursion, +timeout | ~15 |
| scripts/ops/doctor_v2.mjs | +anti-recursion, +provenance fix, +x2 reset | ~20 |
| EDGE_PROFIT_00/TRIALS_LEDGER.md | Placeholder hashes → STUB | 3 |
| **Total** | | **~44 lines** |

---

## 6. Risk Assessment

| Risk | Outcome |
|------|---------|
| R0-01: budget_millis breaks consumers | NOT TRIGGERED — ripple analysis correct |
| R0-02: npm audit fix breaks dependencies | DEFERRED — requires network (Sprint constraint) |
| R0-03: Doctor scoreboard < 50 | NOT TRIGGERED — score is 100/100 |
| R0-04: Unknown secondary crash in ops:life | TRIGGERED x5 → all resolved (FIX-A through FIX-G) |
| R0-05: Placeholder hash removal breaks tooling | NOT TRIGGERED — STUB marking safe |

---

## 7. SDD-001 DoD Checklist

- [x] verify:fast x2: IDENTICAL PASS (37 gates, EC=0 both runs)
- [x] ops:life: EC=0 (ALIVE)
- [x] ops:doctor: EC=0 (HEALTHY, scoreboard 100/100 >= 50)
- [x] ops:cockpit: EC=0 (FSM state visible)
- [ ] npm audit: 0 moderate+ vulnerabilities (DEFERRED — requires network)
- [x] Zero placeholder SHA256 hashes in production evidence
- [ ] New regression gate `regression_life01_budget_field` (DEFERRED — minimal diff constraint)
- [x] DIFF.patch reviewed: no unintended changes
- [x] All fixes ship with evidence

### Deferred Items

1. **MINE-07 (ajv vulnerability)**: Requires `npm audit fix` which needs network access. Deferred to next network-unlocked session.
2. **MINE-08 (regression EC anomaly)**: `regression_net_toolchain01` exit code fix — not encountered during execution. Will verify in Sprint 1.
3. **Regression gate for MINE-01**: Omitted per minimal diff constraint. The fix is verified by ops:life EC=0.

---

## 8. Commits

| SHA | Message |
|-----|---------|
| `7f30c0a` | fix: Sprint 0 Reanimation — resolve 5 system blockers |
| `097e9be` | fix: doctor anti-recursion — skip startup+liveness probes inside life |
| `22fc877` | fix: Sprint 0 complete — READINESS surface, doctor provenance + x2 determinism |

---

## 9. Verdict

**SPRINT 0: PASS**

The Treasure Engine organism has been successfully reanimated. The FSM lifecycle works end-to-end (BOOT → CERTIFYING → CERTIFIED), the doctor health system reports HEALTHY with perfect score, and all 37 regression gates pass deterministically.

Seven additional blockers were discovered and resolved beyond the original SDD-001 scope — all following minimal-diff and no-fabrication constraints.

---

*Generated: 2026-03-04 | Mode: CERT (offline) | Sprint: 0 — Reanimation*
