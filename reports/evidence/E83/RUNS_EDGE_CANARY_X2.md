# E83 RUNS EDGE CANARY X2
- canary_stage: AUTO
- run1_fingerprint: 0d1df679174ec9eac80c828d9f1cf7e813442767ce01188200fa34a636a12580
- run2_fingerprint: 0d1df679174ec9eac80c828d9f1cf7e813442767ce01188200fa34a636a12580
- deterministic_match: true
- recon_fingerprint: e29c4e075a84841f28efda818053d5074e63d0d2ceb0062b41b95c90f42079fc
- calibration_hash: 16398907bd3ee2edef2c303b2dfd566cbca27447f6dea239f79e8759c4dc534f
- demo_daily_sentinel: DEMO_DAILY=ABSENT
- threshold_court_previous_hash: 26853eeef72fc326b7ceff5fe7b7f755d4d6e158e215e85c48342b594a228829
- threshold_court_new_hash: 81c7b1d4fbf16978141baee484c1f2090e55b7161851e8964c88b132255231f7
- stage_policy_hash: 26853eeef72fc326b7ceff5fe7b7f755d4d6e158e215e85c48342b594a228829
- shortlist_hash: daf732b6ffaade933b1aa49cb0887e0f1008fd3388c6d37fe51402304bbab0d3

## stage_decision
| symbol | stage_decision | promotion | reason_codes | recon_windows | invalid_row_rate | spread_p50 | fee_avg | calibration_drift_rate |
|---|---|---|---|---:|---:|---:|---:|---:|
| BTCUSDT | BASELINE | FAIL | WINDOWS_LT_MIN,SPREAD_GT_MAX,READINESS_STREAK_LT_K | 3 | 0.00000000 | 0.800000 | 0.470000 | 0.00275251 |
| ETHUSDT | BASELINE | FAIL | WINDOWS_LT_MIN,SPREAD_GT_MAX,READINESS_STREAK_LT_K | 3 | 0.00000000 | 0.700000 | 0.220000 | 0.00275251 |
| SOLUSDT | BASELINE | FAIL | WINDOWS_LT_MIN,SPREAD_GT_MAX,READINESS_STREAK_LT_K | 3 | 0.00000000 | 0.500000 | 0.106667 | 0.00275251 |

## PROMOTION_READINESS
- BTCUSDT: FAIL (WINDOWS_LT_MIN,SPREAD_GT_MAX,READINESS_STREAK_LT_K)
- ETHUSDT: FAIL (WINDOWS_LT_MIN,SPREAD_GT_MAX,READINESS_STREAK_LT_K)
- SOLUSDT: FAIL (WINDOWS_LT_MIN,SPREAD_GT_MAX,READINESS_STREAK_LT_K)
