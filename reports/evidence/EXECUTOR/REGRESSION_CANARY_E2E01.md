# REGRESSION_CANARY_E2E01.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:deep

## CHECKS
- [PASS] daily_loss_usd_flatten: action=FLATTEN, reason=DAILY_LOSS_EXCEEDED
- [PASS] daily_loss_orders_paused: ordersPaused=true
- [PASS] daily_loss_pct_flatten: action=FLATTEN
- [PASS] daily_loss_ok_continue: action=CONTINUE
- [PASS] small_live_loss_flatten: action=FLATTEN
- [PASS] violation_recorded: violations=1
