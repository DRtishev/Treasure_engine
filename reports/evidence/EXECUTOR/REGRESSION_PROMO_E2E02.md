# REGRESSION_PROMO_E2E02.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:deep

## CHECKS
- [PASS] promotion_missing_metric_insufficient: verdict=INSUFFICIENT_DATA, reason=MISSING_METRICS
- [PASS] promotion_all_missing_insufficient: verdict=INSUFFICIENT_DATA
- [PASS] canary_missing_exposure_pause: action=PAUSE, reason=MISSING_METRIC_FAILCLOSED
- [PASS] canary_missing_daily_loss_pause: action=PAUSE
- [PASS] canary_complete_metrics_continue: action=CONTINUE
