# REGRESSION_PROFIT_E2E_SIZER02_ENFORCED.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:deep

## CHECKS
- [PASS] oversized_rejected_no_sideeffects: success=false, fills=0, orders_placed=0
- [PASS] rejection_error_is_clear: Position size exceeds tier limit: requested=5, max=0.1, tier=micro
- [PASS] invalid_tier_rejected: success=false, error="Position sizer rejected: tier=bogus_tier, reason=unknown tier: bogus_tier"
- [PASS] reduce_enforces_micro_tier: success=false, error="Position size exceeds tier limit: requested=0.5, max=0.1, tier=micro"
- [PASS] reduce_tier_is_micro: currentTier=micro
- [PASS] valid_micro_order_accepted: Order placed: e2e_sizer02_HACK_SIZER02_test_0_3

## FAILED
- NONE
