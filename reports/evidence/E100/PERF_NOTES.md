# E100 PERF NOTES

- chain_mode: FAST_PLUS
- quiet: true
- apply_txn: x2 apply with journaling (~60s)
- rollback: x2 restore with determinism proof (~5s)
- target: under 90s for full E100+apply+rollback (FAST_PLUS mode)
