# EPOCH-V2-S9 AUDIT — Commands Executed

| # | Command | EC | Notes |
|---|---------|---:|-------|
| 1 | `npm run -s verify:fast` (run1) | 0 | All gates PASS incl. 2 new S9 gates |
| 2 | `npm run -s verify:fast` (run2) | 0 | Deterministic — identical output |
| 3 | `node scripts/verify/e108_backtest_determinism_x2_contract.mjs` (run1) | 0 | 10/10 passed |
| 4 | `node scripts/verify/e108_backtest_determinism_x2_contract.mjs` (run2) | 0 | 10/10 passed |
| 5 | `npm run -s verify:deep` | 0 | All 16 E2E gates PASS incl. 4 new S9 gates |
| 6 | `npm run -s epoch:victory:seal` | 0 | PASS |
