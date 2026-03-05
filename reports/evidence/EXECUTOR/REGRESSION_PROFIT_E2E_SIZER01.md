# REGRESSION_PROFIT_E2E_SIZER01.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:deep

## CHECKS
- [PASS] oversized_order_rejected: Oversized order correctly REJECTED
- [PASS] error_mentions_tier: Error: "Position size exceeds tier limit: requested=1, max=0.1, tier=micro"
- [PASS] valid_order_accepted: Valid order placed: e2e_sizer01_HACK_SIZER_01_test_0_1
- [PASS] unknown_tier_rejected: Unknown tier correctly REJECTED
- [PASS] reduce_downgrades_to_micro: REDUCE action downgrades tier to micro

## FAILED
- NONE
