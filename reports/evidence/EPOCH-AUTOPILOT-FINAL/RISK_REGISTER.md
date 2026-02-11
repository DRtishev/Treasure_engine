# RISK REGISTER
- Technical: wall script may fail if manifests are stale during first run.
- Operational: large wall logs can obscure root cause if a gate fails.
- Meta: false SAFE if release governor checks wrong evidence directory.
- Rollback: ledger status drift if epoch:close is run without complete gate evidence.
