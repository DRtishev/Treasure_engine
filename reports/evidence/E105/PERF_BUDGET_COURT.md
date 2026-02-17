# E105 PERF BUDGET COURT

## Status
- verdict: PASS (baseline established, no regressions detected)

## Baseline Summary
- e100: median 2.93s (2.82-3.13s)
- e101: median 3.49s (3.35-3.50s)
- e103: median 3.42s (3.40-3.49s)
- e104: median 2.64s (2.58-2.73s)

## Regression Detection
Speed budget contract (e105_speed_budget_contract.mjs) validates:
- 20% regression threshold above baseline median
- Absolute min delta: 0.5s for fast targets (< 2s baseline)
- Current run measurements compared against baseline

## Verdict
PASS - Baseline established, regression detection operational.
Contract validation runs during verify:e105:contracts phase.
