# RG_METRIC_PARITY03: Required Metric Keys Contract

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:regression:metric-parity03-required-keys
CHECKS_TOTAL: 5
VIOLATIONS: 0

## CHECKS
- [PASS] metric_contract_exists: OK: metric_contract.mjs found
- [PASS] required_keys_min_4: OK: REQUIRED_METRIC_KEYS has 4 entries
- [PASS] validateMetrics_is_function: OK: validateMetrics is a function
- [PASS] valid_metrics_pass: OK: valid metrics accepted
- [PASS] incomplete_metrics_fail: OK: incomplete metrics rejected (missing: max_drawdown, total_pnl, trade_count)

## FAILED
- NONE
