# RISK REGISTER
- verify:edge aggregate still treats standalone clean-clone subgate as optional SKIPPED unless ENABLE_CLEAN_CLONE=1; epoch40 still enforces clean-clone proof internally.
- Ledger commit_sha for 31..40 points to pre-merge branch head and will naturally diverge after merge commit.
- Deterministic packaging currently uses tar.gz fallback (not zip) for stable ordering and timestamps.
