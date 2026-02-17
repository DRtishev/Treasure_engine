# E106 PERF TREND

## Methodology
- Baseline: E105 PERF_BASELINE.md (3-run median, captured 2026-02-17)
- Current: E106 measurement (3-run median)
- Command: CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:<target>

## Trend Table

| Target | E105 Baseline (s) | E106 Current (s) | Delta (s) | Delta (%) | Status |
|--------|-------------------|------------------|-----------|-----------|--------|
| e100 | 2.93 | 3.21 | +0.28 | +9.5% | STABLE |
| e101 | 3.49 | 3.80 | +0.31 | +8.8% | STABLE |
| e103 | 3.42 | 3.84 | +0.42 | +12.2% | STABLE |
| e104 | 2.64 | 3.02 | +0.38 | +14.5% | STABLE |

## Interpretation
- STABLE: Within ±20% of baseline (normal variance)
- IMPROVED: >10% faster than baseline
- REGRESSED: >20% slower than baseline (triggers speed budget contract failure)

## Verdict
Trend snapshot captured. Regression detection enforced by e105_speed_budget_contract.mjs.
