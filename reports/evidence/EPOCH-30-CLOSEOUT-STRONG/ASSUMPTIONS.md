# ASSUMPTIONS LEDGER

1. `verify:specs` enforces canonical `agents.md` headings and ledger structural integrity.
   - Check: `EVIDENCE_EPOCH=EPOCH-30-CLOSEOUT-STRONG npm run verify:specs` (run twice).
   - Result: PASS x2.
2. `verify:wall` should emit machine-readable wall artifacts under active evidence dir.
   - Check: `EVIDENCE_EPOCH=EPOCH-30-CLOSEOUT-STRONG npm run verify:wall` and inspect `WALL_RESULT.json`, `WALL_MARKERS.txt`.
   - Result: PASS.
3. `verify:clean-clone` must avoid recursion loops while still validating wall/governor in nested bootstrap.
   - Check: Run clean-clone via wall; verify `CLEAN_CLONE/CLEAN_CLONE.OK` and nested logs exist.
   - Result: PASS.
4. `verify:release-governor` validates wall markers, evidence completeness, clean-clone marker, and export checksums.
   - Check: run twice and inspect logs.
   - Result: PASS x2.
5. Manifest checksums can be regenerated and validated in same evidence epoch.
   - Check: `npm run regen:manifests` + `sha256sum -c` for SOURCE/EVIDENCE/EXPORT manifests.
   - Result: PASS.
