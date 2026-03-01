# REGRESSION_FSM01.md — FSM Structural Integrity (No Skip States)

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:regression:fsm01-no-skip-states
CHECKS_TOTAL: 38
VIOLATIONS: 0

## CHECKS
- [PASS] forbidden_leak_BOOT_to_RESEARCHING: OK: (BOOT → RESEARCHING) correctly blocked — "Must certify first"
- [PASS] forbidden_leak_BOOT_to_EDGE_READY: OK: (BOOT → EDGE_READY) correctly blocked — "Must certify and research first"
- [PASS] forbidden_leak_CERTIFYING_to_RESEARCHING: OK: (CERTIFYING → RESEARCHING) correctly blocked — "Must fully certify first"
- [PASS] forbidden_leak_DEGRADED_to_EDGE_READY: OK: (DEGRADED → EDGE_READY) correctly blocked — "Must heal then boot then certify first"
- [PASS] forbidden_leak_HEALING_to_CERTIFIED: OK: (HEALING → CERTIFIED) correctly blocked — "Must go through BOOT then CERTIFYING"
- [PASS] no_dead_end_BOOT: OK: BOOT has 1 outgoing transition(s): T01_BOOT_TO_CERTIFYING
- [PASS] no_dead_end_CERTIFYING: OK: CERTIFYING has 2 outgoing transition(s): T02_CERTIFYING_TO_CERTIFIED, T05_ANY_TO_DEGRADED
- [PASS] no_dead_end_CERTIFIED: OK: CERTIFIED has 2 outgoing transition(s): T03_CERTIFIED_TO_RESEARCHING, T05_ANY_TO_DEGRADED
- [PASS] no_dead_end_RESEARCHING: OK: RESEARCHING has 2 outgoing transition(s): T04_RESEARCHING_TO_EDGE_READY, T05_ANY_TO_DEGRADED
- [PASS] no_dead_end_EDGE_READY: OK: EDGE_READY has 1 outgoing transition(s): T05_ANY_TO_DEGRADED
- [PASS] no_dead_end_DEGRADED: OK: DEGRADED has 2 outgoing transition(s): T05_ANY_TO_DEGRADED, T06_DEGRADED_TO_HEALING
- [PASS] no_dead_end_HEALING: OK: HEALING has 2 outgoing transition(s): T05_ANY_TO_DEGRADED, T07_HEALING_TO_BOOT
- [PASS] valid_initial_state: OK: initial_state="BOOT" exists in states
- [PASS] no_orphan_from_T01_BOOT_TO_CERTIFYING: OK: T01_BOOT_TO_CERTIFYING.from="BOOT" is valid
- [PASS] no_orphan_to_T01_BOOT_TO_CERTIFYING: OK: T01_BOOT_TO_CERTIFYING.to="CERTIFYING" is valid
- [PASS] no_orphan_from_T02_CERTIFYING_TO_CERTIFIED: OK: T02_CERTIFYING_TO_CERTIFIED.from="CERTIFYING" is valid
- [PASS] no_orphan_to_T02_CERTIFYING_TO_CERTIFIED: OK: T02_CERTIFYING_TO_CERTIFIED.to="CERTIFIED" is valid
- [PASS] no_orphan_on_fail_T02_CERTIFYING_TO_CERTIFIED: OK: T02_CERTIFYING_TO_CERTIFIED.on_fail="DEGRADED" is valid
- [PASS] no_orphan_from_T03_CERTIFIED_TO_RESEARCHING: OK: T03_CERTIFIED_TO_RESEARCHING.from="CERTIFIED" is valid
- [PASS] no_orphan_to_T03_CERTIFIED_TO_RESEARCHING: OK: T03_CERTIFIED_TO_RESEARCHING.to="RESEARCHING" is valid
- [PASS] no_orphan_from_T04_RESEARCHING_TO_EDGE_READY: OK: T04_RESEARCHING_TO_EDGE_READY.from="RESEARCHING" is valid
- [PASS] no_orphan_to_T04_RESEARCHING_TO_EDGE_READY: OK: T04_RESEARCHING_TO_EDGE_READY.to="EDGE_READY" is valid
- [PASS] no_orphan_on_fail_T04_RESEARCHING_TO_EDGE_READY: OK: T04_RESEARCHING_TO_EDGE_READY.on_fail="CERTIFIED" is valid
- [PASS] no_orphan_from_T05_ANY_TO_DEGRADED: OK: T05_ANY_TO_DEGRADED.from="*" is valid
- [PASS] no_orphan_to_T05_ANY_TO_DEGRADED: OK: T05_ANY_TO_DEGRADED.to="DEGRADED" is valid
- [PASS] no_orphan_from_T06_DEGRADED_TO_HEALING: OK: T06_DEGRADED_TO_HEALING.from="DEGRADED" is valid
- [PASS] no_orphan_to_T06_DEGRADED_TO_HEALING: OK: T06_DEGRADED_TO_HEALING.to="HEALING" is valid
- [PASS] no_orphan_from_T07_HEALING_TO_BOOT: OK: T07_HEALING_TO_BOOT.from="HEALING" is valid
- [PASS] no_orphan_to_T07_HEALING_TO_BOOT: OK: T07_HEALING_TO_BOOT.to="BOOT" is valid
- [PASS] no_orphan_on_fail_T07_HEALING_TO_BOOT: OK: T07_HEALING_TO_BOOT.on_fail="DEGRADED" is valid
- [PASS] state_count: states=7 (expected 7): BOOT, CERTIFYING, CERTIFIED, RESEARCHING, EDGE_READY, DEGRADED, HEALING
- [PASS] transition_count: transitions=7 (expected 7): T01_BOOT_TO_CERTIFYING, T02_CERTIFYING_TO_CERTIFIED, T03_CERTIFIED_TO_RESEARCHING, T04_RESEARCHING_TO_EDGE_READY, T05_ANY_TO_DEGRADED, T06_DEGRADED_TO_HEALING, T07_HEALING_TO_BOOT
- [PASS] forbidden_count: forbidden_transitions=5 (expected 5)
- [PASS] goal_states_defined: goal_states count=2 (expected ≥2): CERTIFIED, EDGE_READY
- [PASS] goal_in_states_CERTIFIED: OK: goal "CERTIFIED" exists in states
- [PASS] goal_reachable_from_BOOT_to_CERTIFIED: OK: BOOT → CERTIFIED via T01_BOOT_TO_CERTIFYING → T02_CERTIFYING_TO_CERTIFIED
- [PASS] goal_in_states_EDGE_READY: OK: goal "EDGE_READY" exists in states
- [PASS] goal_reachable_from_BOOT_to_EDGE_READY: OK: BOOT → EDGE_READY via T01_BOOT_TO_CERTIFYING → T02_CERTIFYING_TO_CERTIFIED → T03_CERTIFIED_TO_RESEARCHING → T04_RESEARCHING_TO_EDGE_READY

## FAILED
- NONE
