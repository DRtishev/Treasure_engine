# AUDIT AFTER SPRINT 9: Real Pipeline Integration

## SNAPSHOT

- **Date:** 2026-03-05
- **Branch:** claude/treasure-engine-sprints-cIYaH
- **HEAD:** 19f22d8 (Sprint 9 commit)
- **Node:** v22.22.0
- **npm:** 10.9.4

## WHAT_CHANGED

### Core modules (3 files)

| File | Change |
|------|--------|
| `core/paper/paper_live_runner.mjs` | Replace legacy feeBps/slipBps with computeTotalCost() SSOT; add evaluatePromotion() after loop; add evaluateCanary() before order placement |
| `core/paper/e111_paper_live_real_feed_runner.mjs` | Replace legacy feeBps/slipBps with computeTotalCost() SSOT |
| `core/paper/paper_trading_harness.mjs` | Replace calibration-based slip + hardcoded fee with computeTotalCost() SSOT |

### New gates (6 files)

| File | Type | Gate ID |
|------|------|---------|
| `scripts/verify/regression_realism_wiring_fast01.mjs` | FAST | RG_REALISM_WIRING_FAST01 |
| `scripts/verify/regression_promo_canary_wiring_fast01.mjs` | FAST | RG_PROMO_CANARY_WIRING_FAST01 |
| `scripts/verify/regression_realism06_paper_uses_costmodel_e2e.mjs` | DEEP | RG_REALISM06 |
| `scripts/verify/regression_realism07_dryrun_uses_costmodel_e2e.mjs` | DEEP | RG_REALISM07 |
| `scripts/verify/regression_promo03_integration_e2e.mjs` | DEEP | RG_PROMO03 |
| `scripts/verify/regression_canary03_integration_e2e.mjs` | DEEP | RG_CANARY03 |

### Specs/Docs (5 files)

| File | Change |
|------|--------|
| `specs/roadmap_v2/DECISION_PACK_S9.md` | New: wiring strategy and gate budget |
| `specs/roadmap_v2/SPRINT_9_REAL_PIPELINE_INTEGRATION_SPEC.md` | New: invariants and DoD |
| `specs/roadmap_v2/TRACEABILITY_MATRIX_V2.md` | Updated: Sprint 9 requirements and invariants |
| `RUNBOOK.md` | Updated: verify:fast/deep inventory, promotion ladder docs |
| `package.json` | Updated: +2 fast gates, +4 deep gates in verify chains |

## COMMANDS_EXECUTED

| # | Command | EC |
|---|---------|---:|
| 1 | `npm run -s verify:fast` (run1) | 0 |
| 2 | `npm run -s verify:fast` (run2) | 0 |
| 3 | `node scripts/verify/e108_backtest_determinism_x2_contract.mjs` (run1) | 0 |
| 4 | `node scripts/verify/e108_backtest_determinism_x2_contract.mjs` (run2) | 0 |
| 5 | `npm run -s verify:deep` | 0 |
| 6 | `npm run -s epoch:victory:seal` | 0 |

## GATE_MATRIX

| Category | Gates | Result |
|----------|-------|--------|
| verify:fast (existing) | ~50 regression gates | ALL PASS x2 |
| verify:fast (S9 new) | realism-wiring-fast01, promo-canary-wiring-fast01 | PASS x2 |
| e108 determinism | 10/10 | PASS x2 |
| verify:deep (existing) | 12 E2E gates | ALL PASS |
| verify:deep (S9 new) | realism06, realism07, promo03, canary03 | ALL PASS |
| victory:seal | 1 | PASS |

## DETERMINISM

- verify:fast: PASS x2 (identical output both runs)
- e108: PASS x2 (10/10 both runs)
- **Verdict: DETERMINISTIC**

## PERFORMANCE

- verify:fast: lightweight, grep-only for S9 gates (+2 gates within budget)
- verify:deep: 16 total gates (12 existing + 4 new S9 gates)
- No heavy computation added to fast path

## EVIDENCE_PATHS

- `reports/evidence/EPOCH-V2-S9-BASELINE/SNAPSHOT.md`
- `reports/evidence/EPOCH-V2-S9-BASELINE/COMMANDS_EXECUTED.md`
- `reports/evidence/EPOCH-V2-S9-BASELINE/GATE_MATRIX.md`
- `reports/evidence/EPOCH-V2-S9-BASELINE/BASELINE_VERDICT.md`
- `reports/evidence/EPOCH-V2-S9-BASELINE/GAPS_PROOF.md`
- `reports/evidence/EPOCH-V2-S9-AUDIT/COMMANDS_EXECUTED.md`
- `reports/evidence/EPOCH-V2-S9-AUDIT/GATE_MATRIX.md`
- `reports/evidence/EPOCH-V2-S9-AUDIT/AUDIT_AFTER_SPRINT_9.md`
- `reports/evidence/EXECUTOR/gates/manual/regression_realism_wiring_fast01.json`
- `reports/evidence/EXECUTOR/gates/manual/regression_promo_canary_wiring_fast01.json`
- `reports/evidence/EXECUTOR/gates/manual/regression_realism06_paper_uses_costmodel_e2e.json`
- `reports/evidence/EXECUTOR/gates/manual/regression_realism07_dryrun_uses_costmodel_e2e.json`
- `reports/evidence/EXECUTOR/gates/manual/regression_promo03_integration_e2e.json`
- `reports/evidence/EXECUTOR/gates/manual/regression_canary03_integration_e2e.json`

## GAPS CLOSED

| Gap | Evidence |
|-----|----------|
| GAP-1: Paper path no computeTotalCost | CLOSED: All 3 paper modules now import and use computeTotalCost(). Verified by RG_REALISM_WIRING_FAST01 (grep) + RG_REALISM06/07 (E2E). |
| GAP-2: Dryrun path no computeTotalCost | CLOSED: e111 runner uses computeTotalCost(). Verified by RG_REALISM07 E2E. |
| GAP-3: No runtime promotion/canary callsites | CLOSED: paper_live_runner.mjs calls evaluatePromotion() after loop and evaluateCanary() on every tick. Verified by RG_PROMO_CANARY_WIRING_FAST01 (grep) + RG_PROMO03/CANARY03 (E2E). |

## VERDICT

**PASS** — Sprint 9 Real Pipeline Integration complete.

All 3 integration gaps identified in Phase 2 are now closed with:
- Runtime wiring in production code paths (not just tests)
- Static grep gates in verify:fast to prevent regression
- E2E gates in verify:deep that run the actual pipeline
- Full determinism verified (x2 anti-flake)
- No verify:fast budget exceeded (+2 gates, grep-only)

## ONE_NEXT_ACTION

```bash
npm run -s verify:fast
```
