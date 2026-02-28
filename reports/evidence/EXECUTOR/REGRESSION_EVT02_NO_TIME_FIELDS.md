# REGRESSION_EVT02_NO_TIME_FIELDS.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 0d8a4b652bff
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] rejects_root_started_at: correctly rejected: forbidden field name at root: "started_at" (matches timestamp pattern)
- [PASS] rejects_root_completed_at: correctly rejected: forbidden field name at root: "completed_at" (matches timestamp pattern)
- [PASS] rejects_root_elapsed_ms: correctly rejected: forbidden field name at root: "elapsed_ms" (matches timestamp pattern)
- [PASS] rejects_root_timestamp: correctly rejected: forbidden field name at root: "timestamp" (matches timestamp pattern)
- [PASS] rejects_root_wall_clock: correctly rejected: forbidden field name at root: "wall_clock" (matches timestamp pattern)
- [PASS] rejects_root_event_ts: correctly rejected: forbidden field name at root: "event_ts" (matches timestamp pattern)
- [PASS] rejects_attrs_started_at: correctly rejected: forbidden field name: "attrs.started_at" (matches timestamp pattern)
- [PASS] rejects_attrs_elapsed_ms: correctly rejected: forbidden field name: "attrs.elapsed_ms" (matches timestamp pattern)
- [PASS] rejects_attrs_wall_ts: correctly rejected: forbidden field name: "attrs.wall_ts" (matches timestamp pattern)
- [PASS] rejects_iso_value_in_attrs: correctly rejected: forbidden ISO timestamp value at "attrs.info": "2026-02-28T10:00:00Z"
- [PASS] accepts_attrs_with_count: OK
- [PASS] accepts_attrs_with_status: OK
- [PASS] accepts_attrs_with_tick_info: OK
- [PASS] accepts_empty_attrs: OK
- [PASS] forbidden_re_started_at: key="started_at" matched=true expected=true
- [PASS] forbidden_re_elapsed_ms: key="elapsed_ms" matched=true expected=true
- [PASS] forbidden_re_timestamp: key="timestamp" matched=true expected=true
- [PASS] forbidden_re_wall_clock: key="wall_clock" matched=true expected=true
- [PASS] forbidden_re_event_ts: key="event_ts" matched=true expected=true
- [PASS] forbidden_re_status: key="status" matched=false expected=false
- [PASS] forbidden_re_run_id: key="run_id" matched=false expected=false
- [PASS] forbidden_re_ticks_total: key="ticks_total" matched=false expected=false
- [PASS] forbidden_re_event_count: key="event_count" matched=false expected=false
- [PASS] existing_bus_file_valid:EPOCH-EVENTBUS-3c4ec9aafacb: 5 events valid
- [PASS] existing_bus_file_valid:EPOCH-EVENTBUS-56bb4849f721: 5 events valid
- [PASS] existing_bus_file_valid:EPOCH-EVENTBUS-AUTOPILOT-56bb4849f721: 3 events valid
- [PASS] existing_bus_file_valid:EPOCH-EVENTBUS-LIFE-56bb4849f721: 4 events valid
- [PASS] existing_bus_file_valid:EPOCH-EVENTBUS-REGISTRY-56bb4849f721: 1 events valid
- [PASS] existing_bus_file_valid:EPOCH-EVENTBUS-TIMEMACHINE-56bb4849f721: 8 events valid
- [PASS] existing_bus_file_valid:EPOCH-EVENTBUS-aead54a15263: 1 events valid

## FAILED
- NONE
