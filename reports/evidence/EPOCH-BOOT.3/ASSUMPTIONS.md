# ASSUMPTIONS (EPOCH-BOOT.3)
1. Wrapped `verify:paper` remains run-scoped and no-overwrite under repeated same-seed runs.
   - Verify: run `npm run verify:paper` twice and compare distinct repeat dirs.
2. Shared wrapper changes do not regress E2 path discipline.
   - Verify: run `npm run verify:e2` twice + `npm run verify:e2:multi`.
3. Source manifest can exclude generated outputs and still validate.
   - Verify: build SOURCE manifest from filtered tracked/untracked sources, run `sha256sum -c`.
4. Repo is ready for next epoch planning after baseline checks.
   - Verify: produce `NEXT_EPOCH_PLAN.md` from available SDD/docs and task tracker.
