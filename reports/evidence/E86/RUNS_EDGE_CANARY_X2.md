# E86 RUNS EDGE CANARY X2
- canary_stage: AUTO
- run1_fingerprint: 5ce0b6a743f860c71c32b0870977cce7f3e9dcb575590e9ad1870c8d5f3afb81
- run2_fingerprint: 5ce0b6a743f860c71c32b0870977cce7f3e9dcb575590e9ad1870c8d5f3afb81
- deterministic_match: true
- demo_daily_sentinel: DEMO_DAILY=SHA256:7b914d61ea3b53c828f09ab55081fd967eaadaa0fa24686ced170ea2f5d59582
- tightening_court_fingerprint: 683caf04e26ba5108a6e249a7af95975c714c3d8a0fd6e0fa0a2ef2cb16bf108
- threshold_policy_hash: e251c6a7a9f96073ff17395a2db1921d56b6c40fed04695c191a0879909b1903
- canary_policy_hash: 7520718ad2bdd020d4d45a7a11f46beaa70b5f1dbabfcad59aca40b657f8231f

| symbol | stage_decision | promotion | reason_codes | recon_windows | invalid_row_rate | spread_p50 | fee_avg | calibration_drift_rate |
|---|---|---|---|---:|---:|---:|---:|---:|
| BTCUSDT | BASELINE | FAIL | WINDOWS_LT_MIN,SPREAD_GT_MAX | 3 | 0.00000000 | 0.800000 | 0.470000 | 0.00275251 |
| ETHUSDT | BASELINE | FAIL | WINDOWS_LT_MIN,SPREAD_GT_MAX | 3 | 0.00000000 | 0.700000 | 0.220000 | 0.00275251 |
| SOLUSDT | BASELINE | FAIL | WINDOWS_LT_MIN,SPREAD_GT_MAX | 3 | 0.00000000 | 0.500000 | 0.106667 | 0.00275251 |

## PROMOTION_READINESS
- BTCUSDT: FAIL (WINDOWS_LT_MIN,SPREAD_GT_MAX)
- ETHUSDT: FAIL (WINDOWS_LT_MIN,SPREAD_GT_MAX)
- SOLUSDT: FAIL (WINDOWS_LT_MIN,SPREAD_GT_MAX)
