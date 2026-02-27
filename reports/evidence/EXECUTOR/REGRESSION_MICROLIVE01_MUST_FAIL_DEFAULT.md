# REGRESSION_MICROLIVE01_MUST_FAIL_DEFAULT.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: a61695cb46d4
NEXT_ACTION: npm run -s verify:regression:microlive01-must-fail-default

## Tests

- T1 (no unlock, NETKILL=1): exit=2 NOT_UNLOCKED=true
- T2 (no unlock, no NETKILL): exit=1 ND_ML01=true
- T3 (wrong token): exit=2

- checks: ALL_PASS
