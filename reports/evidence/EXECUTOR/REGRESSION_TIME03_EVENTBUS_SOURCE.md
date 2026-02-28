# REGRESSION_TIME03_EVENTBUS_SOURCE.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: aead54a15263
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] timemachine_script_exists: /home/user/Treasure_engine/scripts/ops/timemachine_ledger.mjs
- [PASS] imports_eventbus_v1: createBus/eventbus_v1 import required
- [PASS] uses_create_bus: createBus() call required
- [PASS] calls_bus_flush: bus.flush() required to persist events
- [PASS] uses_bus_reducer: timeline must be derived via bus.reduce/events()
- [PASS] no_mtime_ordering: no mtime — OK
- [PASS] declares_eventbus_source_flag: eventbus_source: true required in SUMMARY.json
- [PASS] timemachine_runs_ok: exit code=0: [PASS] ops:timemachine — NONE
  TIMELINE: reports/evidence/EPOCH-TIMEMACHINE-aead54a15263/TIMELINE.jsonl
  SUMMARY:  rep
- [PASS] eventbus_jsonl_produced: reports/evidence/EPOCH-EVENTBUS-aead54a15263/EVENTS.jsonl
- [PASS] eventbus_has_timemachine_events: 8 TIMEMACHINE events found
- [PASS] events_tick_ordered: ticks strictly increasing — OK
- [PASS] has_ledger_boot_event: LEDGER_BOOT event required in bus
- [PASS] has_ledger_seal_event: LEDGER_SEAL event required in bus
- [PASS] timeline_count_matches_bus: TIMELINE has 8 entries, EVENTBUS TIMEMACHINE has 8 events

## FAILED
- NONE
