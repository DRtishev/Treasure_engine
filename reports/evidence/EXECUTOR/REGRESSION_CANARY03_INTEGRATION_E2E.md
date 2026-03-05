# REGRESSION_CANARY03_INTEGRATION_E2E.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:deep

## CHECKS
- [PASS] canary_events_generated: 56 canary events
- [PASS] canary_has_blocking_action: actions: PAUSE, FLATTEN
- [PASS] canary_event_has_reason_code: reason_code=ORDER_RATE_EXCEEDED
- [PASS] canary_state_orders_paused: ordersPaused=true
- [PASS] no_canary_events_in_paper_stage: canary_events=0
- [PASS] canary_reduces_fills: paper=58 vs canary=2
