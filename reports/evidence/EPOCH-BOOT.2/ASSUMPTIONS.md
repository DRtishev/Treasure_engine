# ASSUMPTIONS (EPOCH-BOOT.2)
1. Paper gate can be made run-scoped via wrapper without breaking behavior.
   - Verify with `npm run verify:paper` x2 and inspect run directories.
2. Paper event log can be made run-local by honoring `TREASURE_RUN_DIR` in paper simulation.
   - Verify `results.meta.event_log` and on-disk path under `reports/runs/paper/...`.
3. Repeated same-seed paper runs must not overwrite each other.
   - Verify distinct repeat directories (`default`, `default_2`, ...).
4. Shared wrapper changes must not regress e2 gates.
   - Verify `verify:e2` x2, `verify:e2:multi`, and `verify:core`.
