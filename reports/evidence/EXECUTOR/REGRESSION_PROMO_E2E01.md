# REGRESSION_PROMO_E2E01.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:deep

## CHECKS
- [PASS] paper_all_met_eligible: eligible=true, verdict=PROMOTE_ELIGIBLE
- [PASS] paper_target_micro_live: target_stage=micro_live
- [PASS] paper_criteria_not_met_blocked: eligible=false, verdict=BLOCKED
- [PASS] live_already_at_max: reason_code=ALREADY_AT_MAX_STAGE
- [PASS] micro_to_small_eligible: eligible=true, target=small_live
- [PASS] high_drawdown_blocked: eligible=false, reason=CRITERIA_NOT_MET
