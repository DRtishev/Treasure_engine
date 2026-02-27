# REGRESSION_MICROLIVE02_KILL_SWITCH.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: a61695cb46d4
NEXT_ACTION: npm run -s verify:regression:microlive02-kill-switch

## Tests

- T1 (pnl below floor): exit=1
- T2 (win_rate below threshold): exit=1
- T3 (good metrics → PROCEED): exit=0
- T4 (closed_n < MIN_TRADES → NEEDS_DATA): exit=2
- T5 (decision file written): see fails

- checks: ALL_PASS
