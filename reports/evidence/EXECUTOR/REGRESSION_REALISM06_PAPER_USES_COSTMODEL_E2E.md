# REGRESSION_REALISM06_PAPER_USES_COSTMODEL_E2E.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:deep

## CHECKS
- [PASS] fill_has_cost_model: cost_model present: {"fee_bps":4,"slippage_bps":0.7502,"total_cost_bps":4.7502,"fill_ratio":0.95}
- [PASS] cost_model_has_fee_bps: fee_bps=4
- [PASS] cost_model_has_slippage_bps: slippage_bps=0.7502
- [PASS] cost_model_has_total_cost_bps: total_cost_bps=4.7502
- [PASS] exec_price_from_ssot: exec_price=50003.751 vs market=50000
- [PASS] paper_loop_completes: status=COMPLETED, fills=48
- [PASS] ledger_fills_have_exec_price_offset: 48 fills checked, all have exec_price != price
