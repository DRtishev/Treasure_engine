# ASSUMPTIONS
1. Canonical headings should be uniform across EPOCH-17..EPOCH-26.
   - Check: inspect all epoch files + run `npm run verify:specs`.
   - Result: PASS.
2. `verify:specs` must enforce structure without brittle wording checks.
   - Check: checker validates heading/order/commands/checklist/risk counts and avoids prose matching.
   - Result: PASS.
3. Offline-first policy must be explicit in constraints/template/epochs.
   - Check: review canonical files and random epoch samples.
   - Result: PASS.
4. Next READY epoch remains EPOCH-22 after this docs-only polish.
   - Check: dependency chain in `specs/epochs/INDEX.md` and existing tracker.
   - Result: PASS.
