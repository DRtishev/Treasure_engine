# ASSUMPTIONS LEDGER

1. Epoch25 must be network-opt-in and pass offline by default.
   - Verify: `npm run verify:epoch25` without env flag.
   - Result: CONFIRMED.
2. We can produce deterministic profiling from local fixtures for baseline evidence.
   - Verify: `npm run verify:epoch25` run #1/#2.
   - Result: CONFIRMED.
3. Optional network smoke can be attached only when `ENABLE_NETWORK_TESTS=1`.
   - Verify: gate log indicates skip by default and conditional path.
   - Result: CONFIRMED.
4. Baseline mandatory gates remain green after adding epoch25.
   - Verify: `npm run verify:core`, `npm run verify:phase2`, `npm run verify:integration`.
   - Result: CONFIRMED.
