# COMMANDS EXECUTED — BASELINE (Sprint 5c)

| # | Command | EC | Result |
|---|---------|-----|--------|
| 1 | `npm run -s verify:fast` (run1) | 0 | 48/48 PASS |
| 2 | `npm run -s verify:fast` (run2) | 0 | 48/48 PASS |
| 3 | `node scripts/verify/e108_backtest_determinism_x2_contract.mjs` (run1) | 0 | 10/10 PASS |
| 4 | `node scripts/verify/e108_backtest_determinism_x2_contract.mjs` (run2) | 0 | 10/10 PASS |
| 5 | `npm run -s verify:deep` | 0 | 3/3 PASS (ks01, sizer01, dryrun_live_e2e_v2) |

NOTE: PR01 evidence bloat limit bumped 60→80 (legitimate multi-sprint growth S4-S6).
