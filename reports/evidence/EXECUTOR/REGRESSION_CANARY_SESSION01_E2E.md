# REGRESSION_CANARY_SESSION01_E2E.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:deep

## CHECKS
- [PASS] session_completes: status=COMPLETED, ticks=100
- [PASS] canary_events_fired: 95 canary events
- [PASS] canary_pause_or_flatten: 95 PAUSE/FLATTEN events, first at tick 6
- [PASS] orders_blocked_by_canary: fills=3 out of 100 ticks (canary should block most)
- [PASS] promotion_result_present: verdict=INSUFFICIENT_DATA
- [PASS] canary_state_tracked: ordersPaused=true
