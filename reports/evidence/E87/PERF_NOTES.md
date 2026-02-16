# E87 PERF NOTES
- chain_mode: FAST_PLUS
- ci_mode_target: FAST_PLUS
- doctrine: skip duplicate heavy work in CI by reusing deterministic evidence hashes
- quiet_mode: QUIET=1 affects logs only; fingerprints exclude QUIET
- heavy_work_rules: FULL runs prior epoch verify, FAST_PLUS uses pack parity checks, FAST limits to local contracts
