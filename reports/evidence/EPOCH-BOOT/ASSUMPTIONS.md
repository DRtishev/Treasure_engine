# Assumptions Ledger (EPOCH-BOOT refresh #6)
1. `verify:safety` remains deterministic and validates all critical gate outcomes.
   - Verify: `npm run verify:safety`.
   - Result: PASS (15/15).
2. Core invariants remain intact after latest commit rework.
   - Verify: `npm run verify:e2` x2, `npm run verify:paper` x2, plus `verify:phase2` and `verify:integration`.
   - Result: PASS for all runs.
3. Network checks are disabled by default in verification paths.
   - Verify: `npm run verify:binance`, `npm run verify:websocket` without `ENABLE_NETWORK_TESTS`.
   - Result: PASS with explicit skip-by-policy output.
4. Source manifest can be validated after gate reruns.
   - Verify: `sha256sum -c reports/evidence/EPOCH-BOOT/SHA256SUMS.SOURCE.txt`.
   - Result: PASS.
