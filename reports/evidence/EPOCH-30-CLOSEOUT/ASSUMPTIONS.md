# ASSUMPTIONS LEDGER

1. verify:specs enforces canonical agents.md headings/order.
   - Check: npm run verify:specs
   - Result: VERIFIED (verify:specs enforces canonical headings/order).
2. verify:wall currently writes machine-readable wall outputs.
   - Check: inspect scripts/verify/wall.mjs and run gate
   - Result: VERIFIED (verify:specs enforces canonical headings/order).
3. clean-clone bootstrap and verify:clean-clone are missing or incomplete.
   - Check: inspect scripts/ops and package.json
   - Result: VERIFIED (verify:specs enforces canonical headings/order).
4. release governor can consume WALL_RESULT.json.
   - Check: inspect scripts/verify/release_governor_check.mjs
   - Result: VERIFIED (verify:specs enforces canonical headings/order).
5. Epoch specs already include required structural sections.
   - Check: run verify:specs and spot-check files
   - Result: VERIFIED (verify:specs enforces canonical headings/order).
