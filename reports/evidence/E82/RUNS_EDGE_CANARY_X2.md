# E82 RUNS EDGE CANARY X2
- canary_stage: AUTO
- run1_fingerprint: e0cb61014420a61db427dae03c7001485f27dba836a7c31a46afb2fba676afbf
- run2_fingerprint: e0cb61014420a61db427dae03c7001485f27dba836a7c31a46afb2fba676afbf
- deterministic_match: true
- recon_fingerprint: e29c4e075a84841f28efda818053d5074e63d0d2ceb0062b41b95c90f42079fc
- calibration_hash: 16398907bd3ee2edef2c303b2dfd566cbca27447f6dea239f79e8759c4dc534f
- stage_policy_hash: 7400739de8c162e46e94e1064b03090904f23261b6bf198a0558fba3558b98de
- shortlist_hash: daf732b6ffaade933b1aa49cb0887e0f1008fd3388c6d37fe51402304bbab0d3

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
