# RG_FLATTEN01: Emergency Flatten + Position Sizer

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:regression:flatten01-closes-all
CHECKS_TOTAL: 8
VIOLATIONS: 0

## CHECKS
- [PASS] flatten_exists: OK: emergency_flatten.mjs exists
- [PASS] flatten_has_reason: OK: EMERGENCY_FLATTEN reason present
- [PASS] flatten_no_forbidden_date: OK: no forbidden Date APIs
- [PASS] position_sizer_is_function: OK
- [PASS] micro_tier_limit: OK: micro max_risk=$100 size=10
- [PASS] small_tier_limit: OK: small max_risk=$1000 size=100
- [PASS] normal_tier_limit: OK: normal max_risk=$5000 size=500
- [PASS] unknown_tier_returns_zero: OK: unknown tier → size=0

## FAILED
- NONE
