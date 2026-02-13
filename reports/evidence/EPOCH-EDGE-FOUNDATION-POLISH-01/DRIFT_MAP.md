# DRIFT MAP (SPEC ↔ CODE)

- SPEC: E32..E40 require `SPEC_CONTRACTS.md`/`GATE_PLAN.md`/`FINGERPRINT_POLICY.md` evidence files. CODE previously emitted only generic files. DECISION: FIX CODE (generate required spec-named files per epoch).
- SPEC: PASS requires exit=0 + required evidence exists + golden compare pass. CODE previously did not validate per-epoch required evidence. DECISION: FIX CODE (explicit required evidence check in epoch and aggregate gates).
- SPEC: E39 needs shadow hard-fuse must-fail proof artifact. CODE checked exception but did not write explicit expected-failure evidence. DECISION: FIX CODE (add `EXPECTED_FAILURE.md`).
- SPEC: E40 requires clean-clone reproducibility proof in epoch evidence. CODE had no clean-clone proof in epoch40 gate. DECISION: FIX CODE (offline local clone, rerun gates, compare aggregate fingerprints, write proof and hashes).
- SPEC: docs/index should reflect implemented gates. CODE/docs still said implementation pending. DECISION: FIX SPEC/DOCS (update INDEX and SDD statements).
- SPEC: canonical vectors should avoid case-duplicate path drift. CODEBASE had `tests/vectors/Intent` + `tests/vectors/intent` and `Signal` + `signal`. DECISION: FIX CODE (remove lowercase duplicates, keep canonical contract-case dirs).
