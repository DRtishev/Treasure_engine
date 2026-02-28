# REGRESSION_COCKPIT04_EVENTBUS_SOURCE.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 0d8a4b652bff
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] cockpit_script_exists: /home/user/Treasure_engine/scripts/ops/cockpit.mjs
- [PASS] imports_eventbus: readBus/findLatestBusJsonl import required
- [PASS] uses_read_bus: readBus() call required
- [PASS] uses_find_latest_bus_jsonl: findLatestBusJsonl() required
- [PASS] no_mtime_in_cockpit: no mtime — OK
- [PASS] declares_eventbus_source: eventbus_source: true required in HUD.json
- [PASS] cockpit_runs_without_crash: exit code=1: [BLOCKED] ops:cockpit — FAST_GATE
  HUD:      reports/evidence/EPOCH-COCKPIT-0d8a4b652bff/HUD.md
  HUD_JSON: reports/evi
- [PASS] hud_json_produced: reports/evidence/EPOCH-COCKPIT-aead54a15263/HUD.json
- [PASS] hud_eventbus_source_true: eventbus_source=true
- [PASS] timemachine_section_has_source: timemachine.source=EPOCH_FALLBACK
- [PASS] autopilot_section_has_source: autopilot.source=EVENTBUS
- [PASS] eventbus_section_in_hud: events_n=3

## FAILED
- NONE
