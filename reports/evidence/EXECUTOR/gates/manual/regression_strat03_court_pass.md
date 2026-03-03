# RG_STRAT03_COURT_PASS

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:regression:strat03-court-pass
CHECKS_TOTAL: 24
VIOLATIONS: 0

## CHECKS
- [PASS] s3_court_verdict: OK: verdict=NOT_ELIGIBLE (pipeline processed, no structural failure)
- [PASS] s3_court_DatasetCourt: verdict=PIPELINE_ELIGIBLE reasons=[]
- [PASS] s3_court_ExecutionCourt: verdict=PIPELINE_ELIGIBLE reasons=[]
- [PASS] s3_court_ExecutionSensitivityCourt: verdict=NOT_ELIGIBLE reasons=[FAILS_2X_SLIPPAGE]
- [PASS] s3_court_RiskCourt: verdict=PIPELINE_ELIGIBLE reasons=[]
- [PASS] s3_court_OverfitCourt: verdict=NOT_ELIGIBLE reasons=[DEFLATED_SHARPE_INSUFFICIENT,BOOTSTRAP_CI_FAIL]
- [PASS] s3_court_RedTeamCourt: verdict=NOT_ELIGIBLE reasons=[EXECUTION_ASSUMPTION_BROKEN]
- [PASS] s3_court_SREReliabilityCourt: verdict=LIVE_ELIGIBLE reasons=[]
- [PASS] s4_court_verdict: OK: verdict=LIVE_ELIGIBLE (pipeline processed, no structural failure)
- [PASS] s4_court_DatasetCourt: verdict=PIPELINE_ELIGIBLE reasons=[]
- [PASS] s4_court_ExecutionCourt: verdict=PIPELINE_ELIGIBLE reasons=[]
- [PASS] s4_court_ExecutionSensitivityCourt: verdict=PIPELINE_ELIGIBLE reasons=[]
- [PASS] s4_court_RiskCourt: verdict=PIPELINE_ELIGIBLE reasons=[]
- [PASS] s4_court_OverfitCourt: verdict=TESTING_SET_ELIGIBLE reasons=[]
- [PASS] s4_court_RedTeamCourt: verdict=PIPELINE_ELIGIBLE reasons=[]
- [PASS] s4_court_SREReliabilityCourt: verdict=LIVE_ELIGIBLE reasons=[]
- [PASS] s5_court_verdict: OK: verdict=NOT_ELIGIBLE (pipeline processed, no structural failure)
- [PASS] s5_court_DatasetCourt: verdict=PIPELINE_ELIGIBLE reasons=[]
- [PASS] s5_court_ExecutionCourt: verdict=PIPELINE_ELIGIBLE reasons=[]
- [PASS] s5_court_ExecutionSensitivityCourt: verdict=NOT_ELIGIBLE reasons=[FAILS_2X_SLIPPAGE]
- [PASS] s5_court_RiskCourt: verdict=PIPELINE_ELIGIBLE reasons=[]
- [PASS] s5_court_OverfitCourt: verdict=NOT_ELIGIBLE reasons=[DEFLATED_SHARPE_INSUFFICIENT,BOOTSTRAP_CI_FAIL]
- [PASS] s5_court_RedTeamCourt: verdict=NOT_ELIGIBLE reasons=[EXECUTION_ASSUMPTION_BROKEN]
- [PASS] s5_court_SREReliabilityCourt: verdict=LIVE_ELIGIBLE reasons=[]

## FAILED
- NONE
