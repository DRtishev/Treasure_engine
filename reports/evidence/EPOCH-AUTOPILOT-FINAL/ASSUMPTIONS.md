# ASSUMPTIONS
1. Existing run wrappers already enforce run-dir discipline.
   - Check: inspect `scripts/verify/run_with_context.mjs` and gate logs.
2. Spec epochs 17..26 are the authoritative dependency chain.
   - Check: `specs/epochs/INDEX.md` + `specs/epochs/LEDGER.json`.
3. Release governor should evaluate latest evidence + ledger instead of hardcoded epoch folder.
   - Check: run `npm run verify:release-governor` after updates.
4. paper multi-seed gate can use JSONL structural fingerprints similar to e2 multi.
   - Check: run `npm run verify:paper:multi`.
