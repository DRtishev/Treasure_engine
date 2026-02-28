# REGRESSION_REG05_EVENTBUS_PROMOTION.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 0d8a4b652bff
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] registry_script_exists: /home/user/Treasure_engine/scripts/ops/candidate_registry.mjs
- [PASS] supports_input_epoch_flag: --input-epoch flag required (no mtime/auto-latest)
- [PASS] imports_eventbus_v1: createBus/eventbus_v1 import required
- [PASS] emits_registry_created: REGISTRY_CREATED event required
- [PASS] emits_candidate_promoted: CANDIDATE_PROMOTED event required
- [PASS] declares_eventbus_source: eventbus_source: true required in REGISTRY.json
- [PASS] declares_input_epoch_field: input_epoch field required in REGISTRY.json
- [PASS] calls_bus_flush: bus.flush() required
- [PASS] registry_runs_without_crash: exit code=0: [PASS] ops:candidates — NONE [RUNTIME]
  REGISTRY: reports/evidence/EPOCH-REGISTRY-0d8a4b652bff/REGISTRY.json
  TOTAL:
- [PASS] eventbus_jsonl_produced: reports/evidence/EPOCH-EVENTBUS-aead54a15263/EVENTS.jsonl
- [PASS] eventbus_has_registry_events: 1 REGISTRY events found
- [PASS] registry_created_event_in_bus: REGISTRY_CREATED in bus
- [PASS] registry_json_has_eventbus_source: eventbus_source=true
- [PASS] registry_json_has_input_epoch_field: input_epoch=EPOCH-SWEEP-NONEXISTENT
- [PASS] input_epoch_nonexistent_graceful: --input-epoch nonexistent: exit code=0

## FAILED
- NONE
