# RG_RECONCILE01: Fill Reconciliation Drift Detection

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:regression:reconcile01-detects-drift
CHECKS_TOTAL: 6
VIOLATIONS: 0

## CHECKS
- [PASS] reconcile_is_function: OK
- [PASS] detects_price_drift: OK: PRICE_DRIFT detected
- [PASS] detects_size_drift: OK: SIZE_DRIFT detected
- [PASS] detects_missing_on_exchange: OK: MISSING_ON_EXCHANGE detected
- [PASS] detects_missing_in_ledger: OK: MISSING_IN_LEDGER detected
- [PASS] ok_when_matching: OK: matching fills → ok=true

## FAILED
- NONE
