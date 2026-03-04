# RG_COURT_PIPE01_FULL_SUITE

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:fast
CHECKS_TOTAL: 11
VIOLATIONS: 0

## PIPELINE RESULTS
- liq_vol_fusion: verdict=NOT_ELIGIBLE courts=7 det=PASS
- post_cascade_mr: verdict=NOT_ELIGIBLE courts=7 det=PASS
- multi_regime_adaptive: verdict=NOT_ELIGIBLE courts=7 det=PASS

## CHECKS
- [PASS] COURTS_COUNT_liq_vol_fusion: OK: 7 courts
- [PASS] COURTS_COUNT_post_cascade_mr: OK: 7 courts
- [PASS] COURTS_COUNT_multi_regime_adaptive: OK: 7 courts
- [PASS] DETERMINISM_liq_vol_fusion: OK: hash=f83ab1ad8a43b19e...
- [PASS] DETERMINISM_post_cascade_mr: OK: hash=a0b9beb7b9561c51...
- [PASS] DETERMINISM_multi_regime_adaptive: OK: hash=ed7779ec9c71588d...
- [PASS] CANDIDATES_EVALUATED: 3 candidates: liq_vol_fusion, post_cascade_mr, multi_regime_adaptive
- [PASS] VERDICTS_PRESENT_liq_vol_fusion: OK: DatasetCourt=NEEDS_DATA, ExecutionCourt=NOT_ELIGIBLE, ExecutionSensitivityCourt=NOT_ELIGIBLE, RiskCourt=PIPELINE_ELIGIBLE, OverfitCourt=NEEDS_DATA, RedTeamCourt=NOT_ELIGIBLE, SREReliabilityCourt=LIVE_ELIGIBLE
- [PASS] VERDICTS_PRESENT_post_cascade_mr: OK: DatasetCourt=NEEDS_DATA, ExecutionCourt=NOT_ELIGIBLE, ExecutionSensitivityCourt=PIPELINE_ELIGIBLE, RiskCourt=PIPELINE_ELIGIBLE, OverfitCourt=NEEDS_DATA, RedTeamCourt=PIPELINE_ELIGIBLE, SREReliabilityCourt=LIVE_ELIGIBLE
- [PASS] VERDICTS_PRESENT_multi_regime_adaptive: OK: DatasetCourt=NEEDS_DATA, ExecutionCourt=NOT_ELIGIBLE, ExecutionSensitivityCourt=PIPELINE_ELIGIBLE, RiskCourt=PIPELINE_ELIGIBLE, OverfitCourt=NEEDS_DATA, RedTeamCourt=PIPELINE_ELIGIBLE, SREReliabilityCourt=LIVE_ELIGIBLE
- [PASS] ALL_DETERMINISTIC: OK: all candidates x2 deterministic
