# E78 Canary Thresholds

- canary_stage_default: BASELINE

## stage BASELINE
| symbol | min_robustness_score | max_worstcase_drawdown | min_net_expectancy_worst | max_lookahead_suspect_rate | budget_NOT_ROBUST | budget_CALIBRATION_DRIFT |
|---|---:|---:|---:|---:|---:|---:|
| BTCUSDT | -0.05000000 | 25.00000000 | -0.02000000 | 0.10 | 2 | 0 |
| ETHUSDT | -0.05000000 | 25.00000000 | -0.02000000 | 0.10 | 2 | 0 |
| SOLUSDT | -0.05000000 | 25.00000000 | -0.02000000 | 0.10 | 2 | 0 |

## stage STRICT_1
| symbol | min_robustness_score | max_worstcase_drawdown | min_net_expectancy_worst | max_lookahead_suspect_rate | budget_NOT_ROBUST | budget_CALIBRATION_DRIFT |
|---|---:|---:|---:|---:|---:|---:|
| BTCUSDT | -0.04000000 | 20.00000000 | -0.01500000 | 0.05 | 1 | 0 |
| ETHUSDT | -0.04000000 | 20.00000000 | -0.01500000 | 0.05 | 1 | 0 |
| SOLUSDT | -0.04000000 | 20.00000000 | -0.01500000 | 0.05 | 1 | 0 |
