# REGRESSION_DATA_LOCKS01.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] calibration_contract_exists: schema_version=1.0.0, status=DEFAULTS_ONLY
- [PASS] calibration_contract_schema_valid: All required fields present
- [PASS] calibration_params_valid: 12 params, all have value+source
- [PASS] acquire_stub_exists_acquire_fee_tiers: exists
- [PASS] acquire_stub_exists_acquire_funding_rates: exists
- [PASS] acquire_stub_exists_acquire_market_snapshot: exists
- [PASS] acquire_failclosed_acquire_fee_tiers: Correctly blocked without ALLOW_NETWORK
- [PASS] acquire_failclosed_acquire_funding_rates: Correctly blocked without ALLOW_NETWORK
- [PASS] acquire_failclosed_acquire_market_snapshot: Correctly blocked without ALLOW_NETWORK
- [PASS] locks_dir_absent_ok: LOCKS dir absent (BLOCKED NEEDS_DATA)
