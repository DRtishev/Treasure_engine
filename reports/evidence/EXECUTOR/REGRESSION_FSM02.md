# REGRESSION_FSM02.md — FSM Consciousness Loop (EPOCH-70)

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:regression:fsm02-consciousness
CHECKS_TOTAL: 14
VIOLATIONS: 0

## CHECKS
- [PASS] budget_ms_defined_BOOT: OK: BOOT.budget_ms=30000
- [PASS] budget_ms_defined_CERTIFYING: OK: CERTIFYING.budget_ms=600000
- [PASS] budget_ms_defined_CERTIFIED: OK: CERTIFIED.budget_ms=0
- [PASS] budget_ms_defined_RESEARCHING: OK: RESEARCHING.budget_ms=300000
- [PASS] budget_ms_defined_EDGE_READY: OK: EDGE_READY.budget_ms=0
- [PASS] budget_ms_defined_DEGRADED: OK: DEGRADED.budget_ms=60000
- [PASS] budget_ms_defined_HEALING: OK: HEALING.budget_ms=60000
- [PASS] life_summary_v2_schema: OK: LIFE_SUMMARY.json schema_version=2.0.0
- [PASS] consciousness_result_present: OK: consciousness_result present — reached=false final_state=DEGRADED
- [PASS] reflexes_field_present: OK: reflexes_fired is array (length=0)
- [PASS] fsm_final_state_valid: OK: fsm_final_state="DEGRADED" is valid
- [PASS] proprio_scan_event: OK: PROPRIO_SCAN event found with fsm_state=DEGRADED
- [PASS] consciousness_result_event: OK: CONSCIOUSNESS_RESULT event found — reached=false
- [PASS] no_hardcoded_cert_mode: OK: modes FSM-derived (AUDIT) — proprio fsm_state=DEGRADED

## FAILED
- NONE
