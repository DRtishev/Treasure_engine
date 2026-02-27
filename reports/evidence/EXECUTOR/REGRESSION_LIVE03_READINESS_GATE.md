# REGRESSION_LIVE03_READINESS_GATE.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 5b35ac334736
NEXT_ACTION: npm run -s verify:regression:live03-readiness-gate

## Tests

- T1 (pf<0.5 → KILL): exit=1
- T2 (maxDD>1000 → KILL): exit=1
- T3 (slippage>100 → KILL): exit=1
- T4 (all ok → PROCEED): exit=0
- T5 (stability x2): verdict_a=PROCEED verdict_b=PROCEED
- T6 (closed_n<3 → NEEDS_DATA): exit=2

- checks: ALL_PASS
