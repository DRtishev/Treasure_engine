# ASSUMPTIONS LEDGER

1. Core AI files still contain non-deterministic primitives that should be tracked as controlled debt.
   - Verify: `npm run verify:epoch22`
   - Result: CONFIRMED.
2. A deterministic drift gate can be added without touching core/ai behavior.
   - Verify: `npm run verify:epoch22`
   - Result: CONFIRMED.
3. Adding epoch22 gate to verify wall should remain offline and green.
   - Verify: `npm run verify:wall`
   - Result: CONFIRMED.
4. Baseline verify invariants remain green after this patch.
   - Verify: `npm run verify:core`, `npm run verify:phase2`, `npm run verify:integration`.
   - Result: CONFIRMED.
