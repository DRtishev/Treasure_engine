# REGRESSION_EVT01_SCHEMA_LOCK.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 0d8a4b652bff
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] ssot_doc_exists: /home/user/Treasure_engine/docs/SSOT_EVENT_SCHEMA_V1.md
- [PASS] ssot_has_version_1_0_0: SSOT must declare version 1.0.0
- [PASS] ssot_has_forbidden_fields_section: SSOT must document forbidden fields
- [PASS] ssot_has_tick_field: SSOT must declare tick field
- [PASS] schema_version_is_1_0_0: EVENT_SCHEMA_VERSION=1.0.0
- [PASS] validator_rejects_missing_fields: errors: missing required field: schema_version; missing required field: run_id
- [PASS] validator_accepts_correct_event: OK
- [PASS] canonicalize_sorts_paths: got: ["reports/a.md","reports/b.md"]
- [PASS] canonicalize_sorts_attrs: got: ["a","z"]
- [PASS] make_event_factory_works: OK
- [PASS] mode_CERT_declared: mode CERT in VALID_MODES
- [PASS] mode_CLOSE_declared: mode CLOSE in VALID_MODES
- [PASS] mode_AUDIT_declared: mode AUDIT in VALID_MODES
- [PASS] mode_RESEARCH_declared: mode RESEARCH in VALID_MODES
- [PASS] mode_ACCEL_declared: mode ACCEL in VALID_MODES
- [PASS] mode_LIFE_declared: mode LIFE in VALID_MODES
- [PASS] component_TIMEMACHINE_declared: component TIMEMACHINE in VALID_COMPONENTS
- [PASS] component_AUTOPILOT_declared: component AUTOPILOT in VALID_COMPONENTS
- [PASS] component_COCKPIT_declared: component COCKPIT in VALID_COMPONENTS
- [PASS] component_REGISTRY_declared: component REGISTRY in VALID_COMPONENTS
- [PASS] component_EVENTBUS_declared: component EVENTBUS in VALID_COMPONENTS
- [PASS] component_LIFE_declared: component LIFE in VALID_COMPONENTS

## FAILED
- NONE
