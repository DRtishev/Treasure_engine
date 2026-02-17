# E106 PERF NOTES

## Baseline Lock
E105 PERF_BASELINE.md is locked and validated by e106_baseline_lock.mjs.
Any modification requires PERF_BUDGET_OVERRIDE=1 with documented justification.

## Trend Visibility
PERF_TREND.md provides delta comparison against E105 baseline.
Regression detection remains enforced by e105_speed_budget_contract.mjs (20% threshold).

## Methodology
- Baseline: E105 (3-run median per target)
- Trend: E106 snapshot (3-run median per target)
- Targets: e100, e101, e103, e104
- Command: CI=false CHAIN_MODE=FAST_PLUS QUIET=1
