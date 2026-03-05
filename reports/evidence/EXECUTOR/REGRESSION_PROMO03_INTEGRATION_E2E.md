# REGRESSION_PROMO03_INTEGRATION_E2E.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:deep

## CHECKS
- [PASS] promotion_result_exists: promotion_result returned
- [PASS] verdict_is_valid: verdict=BLOCKED
- [PASS] has_criteria_results: criteria_results count=5
- [PASS] has_reason_code: reason_code=CRITERIA_NOT_MET
- [PASS] has_evidence_summary: evidence_summary=Failed: min_trades (need 100, got 22), sharpe (need 0.5, got
- [PASS] target_stage_is_micro_live: target_stage=micro_live
- [PASS] loop_completed: status=COMPLETED
