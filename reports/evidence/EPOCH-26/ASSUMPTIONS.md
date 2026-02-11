# ASSUMPTIONS LEDGER — EPOCH-26

1. `verify:epoch26` is wired in npm scripts and executable from clean install.
   - Verify: `npm run verify:epoch26` (run #1/#2).
   - Result: PASS.
2. EPOCH-26 gate remains offline/deterministic (no network dependency, fixed timestamps).
   - Verify: inspect gate source + repeat run outputs.
   - Result: PASS.
3. Baseline invariants (`verify:core`, `verify:phase2`, `verify:integration`) remain green after EPOCH-26 patch.
   - Verify: run each mandatory gate and persist logs.
   - Result: PASS.
4. Evidence manifests for EPOCH-26 are reproducible and self-consistent.
   - Verify: regenerate manifests for `EPOCH-26` and run `sha256sum -c` for SOURCE/EVIDENCE manifests.
   - Result: PASS.
