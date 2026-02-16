# E101 PERF NOTES

- chain_mode: FAST_PLUS
- quiet: true
- git_present: true
- apply_txn_v2: x2 apply with journal schema v2 + integrity
- rollback_v2: x2 restore with determinism proof
- foundation_modules: 6 shared libraries eliminate duplication
- target: under 120s for full E101 + apply + rollback (FAST_PLUS mode)
