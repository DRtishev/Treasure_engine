# AUDIT AFTER R3 — Speed/Ergonomics

> Date: 2026-03-05 | Auditor: Principal Engineer + QA Officer

---

## SNAPSHOT

R3 Speed/Ergonomics: 2 invariants enforced (fast tiers with budget, script index freshness), 2 new gates, verify:fast:instant tier operational at ~4s.

## WHAT_CHANGED

| Path | Change |
|------|--------|
| package.json | R3.1: added verify:fast:instant (10 critical gates); R3.2: added ops:script-index; wired 2 new gates |
| scripts/ops/script_index.mjs | R3.2: NEW — script index generator (1046 scripts scanned) |
| artifacts/script_index.json | R3.2: generated script index artifact |
| scripts/verify/regression_fast_tiers_fast01.mjs | New: RG_FAST_TIERS_FAST01 |
| scripts/verify/regression_script_index_fast01.mjs | New: RG_SCRIPT_INDEX_FAST01 |

## COMMANDS_EXECUTED

| # | Command | Exit Code | Notes |
|---|---------|-----------|-------|
| 1 | `npm run -s verify:fast:instant` | 0 | 10 gates, ~4.0s |
| 2 | `npm run -s verify:fast` (run1) | 0 | ALL PASS (64 gates incl 2 new R3 fast) |
| 3 | `npm run -s verify:fast` (run2) | 0 | ALL PASS (deterministic) |
| 4 | `npm run -s verify:deep` | 0 | ALL PASS (25 deep gates) |
| 5 | `npm run -s epoch:victory:seal` | (pending) | After final commit |

## GATE_MATRIX

| Gate | Verdict | Reason Code | Surface |
|------|---------|-------------|---------|
| RG_FAST_TIERS_FAST01 | PASS | NONE | instant ⊆ fast, 10 gates (budget ≤15) |
| RG_SCRIPT_INDEX_FAST01 | PASS | NONE | index exists, 1046 scripts, ±10 tolerance |
| (all existing fast gates) | PASS | NONE | No regression |
| (all existing deep gates) | PASS | NONE | No regression |

## DETERMINISM

Two-run verify:fast: identical output, ALL 64 gates PASS both runs.

## PERFORMANCE

| Metric | Value |
|--------|-------|
| verify:fast duration | ~70s |
| verify:fast:instant duration | ~4.0s |
| ms-per-gate (fast) | ~1094ms (64 gates) |
| verify:deep duration | ~13s |

## EVIDENCE_PATHS

- `reports/evidence/EPOCH-RADLITE-R3/fast_tiers_proof.md`
- `reports/evidence/EPOCH-RADLITE-R3/script_index_proof.md`

## VERDICT

**PASS** — All R3 invariants enforced. verify:fast:instant under 5s target. No regression in existing gates. Full program (R1+R2+R3) complete.

## ONE_NEXT_ACTION

```bash
npm run -s epoch:victory:seal
```
