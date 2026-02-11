# ASSUMPTIONS LEDGER

1. Existing core components can support AI->Signal->Intent without risky refactors.
   - Verify: `npm run verify:epoch23`
   - Result: CONFIRMED.
2. Determinism can be enforced with seed-based tie-breaking in bridge ordering.
   - Verify: `npm run verify:epoch23` run #1/#2
   - Result: CONFIRMED.
3. Wall remains green after adding epoch23 gate.
   - Verify: `npm run verify:wall`
   - Result: CONFIRMED.
4. Baseline mandatory invariants remain green.
   - Verify: `npm run verify:core`, `npm run verify:phase2`, `npm run verify:integration`.
   - Result: CONFIRMED.
