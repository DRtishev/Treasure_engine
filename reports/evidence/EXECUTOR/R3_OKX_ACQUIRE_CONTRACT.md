# R3_OKX_ACQUIRE_CONTRACT.md — EPOCH-67 OKX Acquire Kernel Gates

STATUS: FAIL
REASON_CODE: R3_OKX_ACQUIRE_BLOCKED
RUN_ID: 2c6ea43a6ce4
NEXT_ACTION: npm run -s verify:r3:okx-acquire-contract

## CHECKS
- [PASS] RG_R3_OKX01_WRITE_SCOPE_script_exists: acquire script present
- [PASS] RG_R3_OKX01_WRITE_SCOPE_writes_incoming: writes_incoming=true
- [PASS] RG_R3_OKX01_WRITE_SCOPE_no_executor_write: no_executor_write=true
- [PASS] RG_R3_OKX01_WRITE_SCOPE_replay_exists: replay script present
- [FAIL] RG_R3_OKX02_LOCK_FIRST_fixture_exists: MISSING
- [FAIL] RG_R3_OKX03_EVENTBUS_replay_pass: replay FAIL EC=2 stderr=
- [PASS] RG_R3_OKX03_EVENTBUS_events_file: EVENTS.jsonl present
- [PASS] RG_R3_OKX03_EVENTBUS_required_events: all required events present: REPLAY_BOOT, REPLAY_APPLY, REPLAY_SEAL
- [PASS] RG_R3_OKX03_EVENTBUS_tick_order: ticks monotonically increasing: [1, 2, 3]
- [PASS] RG_R3_OKX04_ALLOWFILE_double_key_guard: allow_ref=true flag_check=true
- [PASS] RG_R3_OKX04_ALLOWFILE_netkill_guard: netkill_check=true
- [PASS] RG_R3_OKX04_ALLOWFILE_absent_now: ALLOW_NETWORK file absent — hygiene OK
- [PASS] RG_R3_OKX04_ALLOWFILE_ec2_refusal: ec2_refusal_pattern=true
- [PASS] RG_R3_OKX04_ALLOWFILE_ec1_contract: ec1_contract_pattern=true
- [PASS] r3_not_wired_into_daily: not wired — OK

## FAILED
- RG_R3_OKX02_LOCK_FIRST_fixture_exists: MISSING
- RG_R3_OKX03_EVENTBUS_replay_pass: replay FAIL EC=2 stderr=
