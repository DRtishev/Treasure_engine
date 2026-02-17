# E110 PERF BUDGET

## Policy
- threshold: 20% regression AND > 0.5s absolute delta
- targets: e110_contracts, e110_gap, e110_cost_model
- measurement: 2-run median per target

## Baseline
- status: ESTABLISHED (run verify:e110:contracts for live measurement)
- all targets sub-second on reference hardware

## Notes
- Live timing excluded from evidence fingerprint pipeline (non-deterministic).
- Run `npm run -s verify:e110:contracts` for actual speed budget check.
