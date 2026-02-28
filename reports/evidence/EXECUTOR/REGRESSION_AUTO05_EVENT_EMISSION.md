# REGRESSION_AUTO05_EVENT_EMISSION.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: aead54a15263
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] autopilot_script_exists: /home/user/Treasure_engine/scripts/ops/autopilot_court_v2.mjs
- [PASS] imports_eventbus_v1: createBus/eventbus_v1 import required
- [PASS] emits_plan_created: PLAN_CREATED event required
- [PASS] emits_refusal_event: REFUSAL event required per refusal
- [PASS] emits_apply_allowed: APPLY_ALLOWED event required
- [PASS] emits_apply_executed: APPLY_EXECUTED event required
- [PASS] calls_bus_flush: bus.flush() required
- [PASS] declares_eventbus_source: eventbus_source: true required in PLAN.json
- [PASS] autopilot_runs_without_crash: exit code=0: [PASS] ops:autopilot — NONE [DRY_RUN] mode=CERT
  PLAN:      reports/evidence/EPOCH-AUTOPILOTV2-aead54a15263/PLAN.md
  P
- [PASS] eventbus_jsonl_produced: reports/evidence/EPOCH-EVENTBUS-aead54a15263/EVENTS.jsonl
- [PASS] eventbus_has_autopilot_events: 1 AUTOPILOT events found
- [PASS] plan_created_event_in_bus: PLAN_CREATED event found in bus
- [PASS] events_tick_ordered: ticks strictly increasing — OK
- [PASS] apply_run_succeeds_with_token: --apply with valid token: exit code=0
- [PASS] apply_allowed_event_in_bus: APPLY_ALLOWED in bus
- [PASS] apply_executed_event_in_bus: APPLY_EXECUTED in bus

## FAILED
- NONE
