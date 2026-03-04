# RG_DOCTOR_SCORE01: Doctor Confidence Score

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:regression:doctor-score01-confidence
CHECKS_TOTAL: 5
VIOLATIONS: 0

## CHECKS
- [PASS] has_confidenceScore_var: OK: confidenceScore variable present
- [PASS] writes_confidence_score: OK: confidence_score written to evidence
- [PASS] emits_confidence_in_verdict: OK: confidence_score emitted in DOCTOR_VERDICT event
- [PASS] doctor_history_exists: OK: doctor_history.mjs exists
- [PASS] doctor_history_exports_append: OK: appendDoctorHistory exported

## FAILED
- NONE
