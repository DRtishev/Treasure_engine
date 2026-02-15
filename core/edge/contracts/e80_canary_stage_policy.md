# E80 Canary Stage Policy

- canary_stage_default_non_ci: AUTO
- canary_stage_default_ci: AUTO
- MIN_WINDOWS_STRICT: 3
- MAX_DRIFT_STRICT: 0.005
- MAX_INVALID_STRICT: 0.05

## AUTO selection rule
- stage STRICT_1 iff all are true per symbol:
  - recon_windows >= MIN_WINDOWS_STRICT
  - calibration_drift_rate <= MAX_DRIFT_STRICT
  - invalid_row_rate <= MAX_INVALID_STRICT
- otherwise stage BASELINE

## promotion_readiness
- readiness PASS iff stage == STRICT_1
- readiness FAIL iff stage == BASELINE
