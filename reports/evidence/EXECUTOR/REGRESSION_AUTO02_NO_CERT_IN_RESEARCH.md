# REGRESSION_AUTO02_NO_CERT_IN_RESEARCH.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 3c4ec9aafacb
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] autopilot_script_exists: /home/user/Treasure_engine/scripts/ops/autopilot_court_v2.mjs
- [PASS] script_has_research_mode: RESEARCH mode must be declared
- [PASS] script_has_cert_in_research_guard: AUTO02_CERT_IN_RESEARCH guard or RESEARCH_MODE_CERT_SCRIPTS_FORBIDDEN check required
- [PASS] has_research_cert_check_fn: checkResearchNoCert or equivalent function required
- [PASS] script_has_audit_mode: AUDIT mode must be declared alongside RESEARCH

## FAILED
- NONE
