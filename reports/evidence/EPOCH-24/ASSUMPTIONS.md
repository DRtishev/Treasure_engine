# ASSUMPTIONS LEDGER

1. Existing artifacts from `verify:phase2` provide `reports/court_report.json` needed for reality-gap checks.
   - Verify: `npm run verify:epoch24`
   - Result: CONFIRMED.
2. We can implement deterministic walk-forward check with fixed synthetic folds (no network/no randomness).
   - Verify: `npm run verify:epoch24` run #1/#2
   - Result: CONFIRMED.
3. Adding epoch24 gate to wall will not break baseline invariants.
   - Verify: `npm run verify:wall`
   - Result: CONFIRMED.
4. Mandatory baseline gates remain green post-patch.
   - Verify: `npm run verify:core`, `npm run verify:phase2`, `npm run verify:integration`.
   - Result: CONFIRMED.
