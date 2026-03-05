# REGRESSION_BURNIN01_E2E.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:deep

## CHECKS
- [PASS] burnin_completes: status=COMPLETED, ticks=216, fills=100
- [PASS] burnin_has_fills: fills=100
- [PASS] ledger_reconciles: realized=-105.4083, unrealized=-10.7850, equity=9883.8068, drift=0.000000
- [PASS] fees_tracked: total_fees=19.0000
- [PASS] slippage_tracked: total_slippage=3.5634
- [PASS] fills_have_exec_price: 100/100 fills have exec_price
- [PASS] promotion_result_returned: verdict=BLOCKED
- [PASS] promotion_verdict_valid: verdict=BLOCKED, valid_verdicts=PROMOTE_ELIGIBLE,BLOCKED,INSUFFICIENT_DATA
- [PASS] multi_day_coverage: ticks=216 (target >= 200)
