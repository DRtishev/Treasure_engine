# RUNBOOK

## Deterministic baseline gates
```bash
npm ci
npm run verify:paper
npm run verify:paper
npm run verify:e2
npm run verify:e2
npm run verify:e2:multi
npm run verify:phase2
npm run verify:integration
npm run verify:core
```

## Run-scoped output layout
- E2: `reports/runs/e2/<seed>/<repeat>/<run_id>/`
- Paper: `reports/runs/paper/<seed>/<repeat>/<run_id>/`

## Evidence workflow
- Use `reports/evidence/<EPOCH-ID>/` with preflight, gate logs, diff, manifests, and summary.

## Notes
- Network verification remains disabled by default; enable explicitly with `ENABLE_NETWORK_TESTS=1`.
- Live trading is not enabled in verification paths.
