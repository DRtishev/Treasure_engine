# REGRESSION_CANARY_E2E02.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:deep

## CHECKS
- [PASS] order_rate_exceeded_pause: action=PAUSE, reason=ORDER_RATE_EXCEEDED
- [PASS] order_rate_orders_paused: ordersPaused=true
- [PASS] order_rate_ok_continue: action=CONTINUE
- [PASS] small_live_rate_pause: action=PAUSE
- [PASS] exposure_warning_reduce: action=REDUCE
- [PASS] order_rate_violation_severity: severity=CRITICAL
