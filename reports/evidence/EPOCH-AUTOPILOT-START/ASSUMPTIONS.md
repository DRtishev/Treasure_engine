# ASSUMPTIONS
1. verify:specs is the prerequisite gate and must pass before offline wall.
   - Check: `npm run verify:specs`
   - Result: PASS after normalizing EPOCH-26 required headings.
2. verify:paper and verify:e2 are deterministic and run-scoped.
   - Check: inspect logs for run_dir pattern under reports/runs/<gate>/<seed>/<repeat>/<run_id>/.
   - Result: PASS with non-overwriting repeats (default, default_2, ...; multi_r1, multi_r2, ...).
3. Multi-seed stability is enforced by verify:e2:multi.
   - Check: `npm run verify:e2:multi` log for seed/repeat summary.
   - Result: PASS (seeds=3; repeat comparison stable for seed 12345).
4. Archive discipline is already enforced by .gitignore.
   - Check: `.gitignore` contains *.zip, *.tar.gz, reports/runs/, node_modules/ patterns.
   - Result: PASS.
