# REGRESSION_OB_OKX05.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: c7c93c538a8c
NEXT_ACTION: npm run -s verify:regression:ob-okx05-eventbus-events

## POLICY
- Replay must exit EC=0
- EventBus epoch dir must be created
- BOOK_BOOT and BOOK_SEAL must be emitted
- All events must have mode=CERT
- Events must be tick-only (no ts/timestamp/time)

## CHECKS
- [PASS] replay_script_exists: edge_okx_orderbook_01_offline_replay.mjs present — OK
- [PASS] fixture_exists: fixture.jsonl present — OK
- [PASS] replay_exit_code_zero: replay exited with EC=0 — PASS
- [PASS] replay_stdout_contains_pass: stdout contains [PASS] — OK
- [PASS] eventbus_epoch_dir_created: EPOCH dir exists: reports/evidence/EPOCH-EVENTBUS-REPLAY-REPLAY-OKX-ORDERBOOK-okx_orderbook_ws — OK
- [PASS] eventbus_log_has_book_boot: BOOK_BOOT event present in eventbus log — OK
- [PASS] eventbus_log_has_book_seal: BOOK_SEAL event present in eventbus log — OK
- [PASS] eventbus_log_has_book_reset: BOOK_RESET event present in eventbus log — OK
- [PASS] all_events_are_cert_mode: all 8 events have mode=CERT — OK
- [PASS] all_events_have_no_time_fields: all events are tick-only (no ts/timestamp/time) — OK

## FAILED
- NONE
