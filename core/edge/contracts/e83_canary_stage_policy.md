# E83 Canary Stage Policy

- canary_stage_default_non_ci: AUTO
- canary_stage_default_ci: AUTO
- MIN_WINDOWS_STRICT: 4
- MAX_DRIFT_STRICT: 0.0045
- MAX_INVALID_STRICT: 0.0400
- MAX_SPREAD_P50_STRICT: 0.0950
- MAX_FEE_AVG_STRICT: 6.0000
- MIN_CONSECUTIVE_STRICT: 2

## AUTO selection rule
- stage STRICT_1 iff all are true per symbol:
  - recon_windows >= MIN_WINDOWS_STRICT
  - calibration_drift_rate <= MAX_DRIFT_STRICT
  - invalid_row_rate <= MAX_INVALID_STRICT
  - spread_p50 <= MAX_SPREAD_P50_STRICT
  - fee_avg <= MAX_FEE_AVG_STRICT
  - readiness consecutive passes >= MIN_CONSECUTIVE_STRICT
- otherwise stage BASELINE
