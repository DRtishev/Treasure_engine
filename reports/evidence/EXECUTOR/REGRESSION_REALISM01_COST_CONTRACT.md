# REGRESSION_REALISM01_COST_CONTRACT.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] cost_model_exports_computeTotalCost: computeTotalCost is exported function
- [PASS] cost_result_required_fields: All 12 required fields present
- [PASS] cost_result_field_types: All fields have correct types
- [PASS] fill_ratio_range: fill_ratio=0.95
- [PASS] funding_status_valid: funding_status=KNOWN
- [PASS] fees_model_exists: computeFee exported
- [PASS] slippage_model_exists: computeSlippage exported
- [PASS] funding_model_exists: computeFunding exported
- [PASS] contract_json_exists: version=2.0.0, fields=12

## FAILED
- NONE
