# DRIFT MAP
- verify wrote to tracked `tests/vectors/**` on every run -> now compares actual-vs-golden and writes actual/diff under evidence; golden overwrite only with `UPDATE_GOLDENS=1`.
- contracts used non-SSOT field names and ad-hoc schemas -> now enforce canonical contract fields from CONTRACTS_CATALOG.
- determinism used `toFixed` rounding -> now uses `truncateTowardZero` and canonical sorted serialization.
- verify:edge logs were not run-scoped and weak on failures -> now writes `verify_epochXX_<run>.log` and summary json+md with status.
- no-dirty checks were absent -> now checks tracked drift against pre-run git status snapshots.
