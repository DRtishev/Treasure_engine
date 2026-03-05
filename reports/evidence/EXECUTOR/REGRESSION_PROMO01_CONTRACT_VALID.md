# REGRESSION_PROMO01_CONTRACT_VALID.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] promotion_ladder_exports: evaluatePromotion exported
- [PASS] promotion_result_fields: All 6 fields present
- [PASS] verdict_valid: verdict=PROMOTE_ELIGIBLE
- [PASS] criteria_results_array: criteria_results length=5
- [PASS] criteria_result_schema: All criteria results have required fields
- [PASS] stages_exported: STAGES=["paper","micro_live","small_live","live"]
- [PASS] promotion_contract_json: version=1.0.0, stages=4
