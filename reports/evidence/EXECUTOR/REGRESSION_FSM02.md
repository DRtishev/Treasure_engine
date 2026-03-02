# REGRESSION_FSM02.md — FSM Consciousness Loop (EPOCH-70)

STATUS: FAIL
REASON_CODE: FSM_STRUCTURAL_VIOLATION
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:regression:fsm02-consciousness
CHECKS_TOTAL: 14
VIOLATIONS: 7

## CHECKS
- [PASS] budget_ms_defined_BOOT: OK: BOOT.budget_ms=30000
- [PASS] budget_ms_defined_CERTIFYING: OK: CERTIFYING.budget_ms=600000
- [PASS] budget_ms_defined_CERTIFIED: OK: CERTIFIED.budget_ms=0
- [PASS] budget_ms_defined_RESEARCHING: OK: RESEARCHING.budget_ms=300000
- [PASS] budget_ms_defined_EDGE_READY: OK: EDGE_READY.budget_ms=0
- [PASS] budget_ms_defined_DEGRADED: OK: DEGRADED.budget_ms=60000
- [PASS] budget_ms_defined_HEALING: OK: HEALING.budget_ms=60000
- [FAIL] life_summary_v2_schema: FAIL: schema_version=1.0.0 (expected 2.0.0)
- [FAIL] consciousness_result_present: FAIL: consciousness_result missing or invalid
- [FAIL] reflexes_field_present: FAIL: reflexes_fired missing or not an array
- [FAIL] fsm_final_state_valid: FAIL: fsm_final_state="undefined" not in kernel states
- [FAIL] proprio_scan_event: FAIL: PROPRIO_SCAN event not found in LIFE EventBus
- [FAIL] consciousness_result_event: FAIL: CONSCIOUSNESS_RESULT event not found in LIFE EventBus
- [FAIL] no_hardcoded_cert_mode: FAIL: no evidence of FSM-derived modes (no PROPRIO_SCAN with fsm_state)

## FAILED
- life_summary_v2_schema: FAIL: schema_version=1.0.0 (expected 2.0.0)
- consciousness_result_present: FAIL: consciousness_result missing or invalid
- reflexes_field_present: FAIL: reflexes_fired missing or not an array
- fsm_final_state_valid: FAIL: fsm_final_state="undefined" not in kernel states
- proprio_scan_event: FAIL: PROPRIO_SCAN event not found in LIFE EventBus
- consciousness_result_event: FAIL: CONSCIOUSNESS_RESULT event not found in LIFE EventBus
- no_hardcoded_cert_mode: FAIL: no evidence of FSM-derived modes (no PROPRIO_SCAN with fsm_state)
