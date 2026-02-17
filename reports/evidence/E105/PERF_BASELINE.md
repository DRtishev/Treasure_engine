# E105 PERF BASELINE

## Measurement Method
- Command: CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:<target>
- Runs: 3 per target
- Metric: Median duration (seconds)
- Timing: Wall-clock time (Date.now() before/after)
- Format: Seconds with 2 decimal places

## Hardware/Environment Caveat
Performance measurements are environment-dependent.
Baseline captured on this specific system configuration.
Regression thresholds account for system noise (+20% default).

## Baseline Measurements

### E100
- run1: 2.82s
- run2: 2.93s
- run3: 3.13s
- median: 2.93s
- min: 2.82s
- max: 3.13s

### E101
- run1: 3.35s
- run2: 3.49s
- run3: 3.50s
- median: 3.49s
- min: 3.35s
- max: 3.50s

### E103
- run1: 3.40s
- run2: 3.42s
- run3: 3.49s
- median: 3.42s
- min: 3.40s
- max: 3.49s

### E104
- run1: 2.58s
- run2: 2.64s
- run3: 2.73s
- median: 2.64s
- min: 2.58s
- max: 2.73s

## Regression Threshold
- default: 20% above median
- absolute_min_delta: 0.5s (for fast targets < 2s baseline)
- override: PERF_BUDGET_OVERRIDE=1 (must be documented)
