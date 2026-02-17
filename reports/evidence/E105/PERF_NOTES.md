# E105 PERF NOTES

## Methodology
- Measurement: 3 runs per target (CI=false CHAIN_MODE=FAST_PLUS QUIET=1)
- Metric: Median duration (middle value when sorted)
- Timing: Wall-clock time via Date.now() before/after
- Targets: verify:e100, verify:e101, verify:e103, verify:e104

## Why Median
Median is robust to outliers and provides stable baseline:
- Not affected by one-time spikes (GC, system load)
- Middle value of 3 runs gives consistent measurement
- Better than mean for skewed distributions

## Regression Threshold
- Default: 20% above baseline median
- Rationale: Accounts for system noise, hardware variance
- Absolute min delta: 0.5s for fast targets (< 2s baseline)
- Why: Fast targets have higher % variance but low absolute impact

## Hardware/Environment Caveat
Performance measurements are environment-dependent:
- CPU model, clock speed, core count
- Available memory, disk I/O speed
- System load, background processes
- Node.js version, npm cache state

Baseline captured on specific system configuration (see PREFLIGHT.md).
Regressions detected relative to THIS baseline, not absolute values.

## Override Policy
PERF_BUDGET_OVERRIDE=1 allows ignoring regressions.
MUST be documented in evidence with justification:
- Expected regression from new feature
- Hardware change (documented in PREFLIGHT)
- Temporary spike pending optimization

Overrides should be temporary and tracked in follow-up epochs.
