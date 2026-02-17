# E108 OVERFIT COURT

- fixture: 200 bars

## Overfit Court: breakout_atr
- verdict: FAIL

### Checks
- min_folds: PASS (folds=3 threshold=2)
- is_oos_ratio: FAIL (ratio=Infinity threshold=3)
- param_count: PASS (params=3 threshold=5)
- fold_stability: PASS (stddev=0.0000 threshold=2)
- oos_positive: FAIL (avg_oos=0.0000)

### Failure Reasons
- IS/OOS ratio too high: Infinity > 3
- Negative OOS performance: avg=0.0000

### Metrics
- avg_is: 0.0085
- avg_oos: 0.0000
- is_oos_ratio: Infinity
- param_count: 3
- stability: 0.0000
- fold_count: 3

## Overfit Court: mean_revert_rsi
- verdict: FAIL

### Checks
- min_folds: PASS (folds=3 threshold=2)
- is_oos_ratio: FAIL (ratio=4.21 threshold=3)
- param_count: PASS (params=3 threshold=5)
- fold_stability: PASS (stddev=0.0144 threshold=2)
- oos_positive: FAIL (avg_oos=-0.0008)

### Failure Reasons
- IS/OOS ratio too high: 4.21 > 3
- Negative OOS performance: avg=-0.0008

### Metrics
- avg_is: 0.0035
- avg_oos: -0.0008
- is_oos_ratio: 4.21
- param_count: 3
- stability: 0.0144
- fold_count: 3

## Overall Verdict
FAIL - No strategy passed all checks
