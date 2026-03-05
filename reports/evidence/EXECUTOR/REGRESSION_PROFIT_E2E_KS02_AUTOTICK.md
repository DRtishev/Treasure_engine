# REGRESSION_PROFIT_E2E_KS02_AUTOTICK.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:deep

## CHECKS
- [PASS] pre_state_clean: paused=false, lastEvalTs=0
- [PASS] auto_tick_blocked_order: Order correctly BLOCKED by auto-tick (no manual evaluate)
- [PASS] error_mentions_kill_switch: Error: "Kill switch active: orders paused (last_action=FLATTEN)"
- [PASS] evaluate_was_called: lastEvalTs=1000000, paused=true
- [PASS] no_fills: No fills (correct)
- [PASS] safe_metrics_order_accepted: Order placed after safe metrics: e2e_ks02_HACK_KS02_test_0_1

## FAILED
- NONE
