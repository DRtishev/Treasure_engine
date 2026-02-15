# E84 RUNS EDGE CANARY X2
- canary_stage: AUTO
- run1_fingerprint: 1e7fec826377b2898b15cf8adfcc0fd04b6f3da5e8121bdd7fb7e3cf51d0e958
- run2_fingerprint: 1e7fec826377b2898b15cf8adfcc0fd04b6f3da5e8121bdd7fb7e3cf51d0e958
- deterministic_match: true
- recon_fingerprint: e29c4e075a84841f28efda818053d5074e63d0d2ceb0062b41b95c90f42079fc
- calibration_hash: 16398907bd3ee2edef2c303b2dfd566cbca27447f6dea239f79e8759c4dc534f
- demo_daily_sentinel: DEMO_DAILY=ABSENT
- threshold_court_previous_hash: 81c7b1d4fbf16978141baee484c1f2090e55b7161851e8964c88b132255231f7
- threshold_court_new_hash: 81c7b1d4fbf16978141baee484c1f2090e55b7161851e8964c88b132255231f7
- stage_policy_hash: e52f0f9afd7995a3be7edf50fe85829bb55b2d1f39f214d344086949666683f6

## stage_decision
| symbol | stage_decision | promotion | reason_codes | recon_windows | invalid_row_rate | spread_p50 | fee_avg | calibration_drift_rate |
|---|---|---|---|---:|---:|---:|---:|---:|
| BTCUSDT | BASELINE | FAIL | WINDOWS_LT_MIN,SPREAD_GT_MAX | 3 | 0.00000000 | 0.800000 | 0.470000 | 0.00275251 |
| ETHUSDT | BASELINE | FAIL | WINDOWS_LT_MIN,SPREAD_GT_MAX | 3 | 0.00000000 | 0.700000 | 0.220000 | 0.00275251 |
| SOLUSDT | BASELINE | FAIL | WINDOWS_LT_MIN,SPREAD_GT_MAX | 3 | 0.00000000 | 0.500000 | 0.106667 | 0.00275251 |

## PROMOTION_READINESS
- BTCUSDT: FAIL (WINDOWS_LT_MIN,SPREAD_GT_MAX)
- ETHUSDT: FAIL (WINDOWS_LT_MIN,SPREAD_GT_MAX)
- SOLUSDT: FAIL (WINDOWS_LT_MIN,SPREAD_GT_MAX)
