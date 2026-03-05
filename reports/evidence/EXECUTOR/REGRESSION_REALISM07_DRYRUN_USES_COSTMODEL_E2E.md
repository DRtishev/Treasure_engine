# REGRESSION_REALISM07_DRYRUN_USES_COSTMODEL_E2E.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:deep

## CHECKS
- [PASS] runner_produces_fills: 20 fills produced
- [PASS] fill_has_cost_model: cost_model: {"fee_bps":4,"slippage_bps":0.7502,"total_cost_bps":4.7502}
- [PASS] cost_model_has_fee_bps: fee_bps=4
- [PASS] cost_model_has_slippage_bps: slippage_bps=0.7502
- [PASS] cost_model_has_total_cost_bps: total_cost_bps=4.7502
- [PASS] all_fills_have_cost_model: All 20 fills have cost_model
- [PASS] summary_hash_present: hash=3ee5d0bfeee7c430...
