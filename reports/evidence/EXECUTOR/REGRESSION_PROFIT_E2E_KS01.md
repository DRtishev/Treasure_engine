# REGRESSION_PROFIT_E2E_KS01.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:deep

## CHECKS
- [PASS] flatten_triggered: FLATTEN triggered, onFlatten called=true
- [PASS] order_blocked: Order correctly REJECTED when kill switch active
- [PASS] error_mentions_kill_switch: Error: "Kill switch active: orders paused (last_action=FLATTEN)"
- [PASS] no_fills: No fills (correct)
- [PASS] orders_resume_after_reset: Order placed after reset: e2e_ks01_HACK_KS_01_test_0_1

## FAILED
- NONE
