# RG_COURT_WIRING02: Guard Rejects Empty Court Verdicts

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:regression:court-wiring02-guard-rejects-empty
CHECKS_TOTAL: 6
VIOLATIONS: 0

## CHECKS
- [PASS] rejects_empty_verdicts: OK: guard rejected — guard fail: FAIL_CLOSED: court_verdicts required but empty — run Edge Lab pipeline first
- [PASS] rejects_missing_verdicts: OK: guard rejected — guard fail: FAIL_CLOSED: court_verdicts required but empty — run Edge Lab pipeline first
- [PASS] rejects_no_courts_array: OK: guard rejected — guard fail: FAIL_CLOSED: no edge_lab verdict with courts in court_verdicts array
- [PASS] passes_valid_verdicts: OK: guard passed — backtest_sharpe=1.5, edge_lab=PIPELINE_ELIGIBLE
- [PASS] rejects_blocked_verdict: OK: guard rejected — guard fail: edge_lab_verdict=BLOCKED
- [PASS] rejects_not_eligible_verdict: OK: guard rejected — guard fail: edge_lab_verdict=NOT_ELIGIBLE

## FAILED
- NONE
