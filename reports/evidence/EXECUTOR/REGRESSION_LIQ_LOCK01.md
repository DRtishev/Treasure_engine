# REGRESSION_LIQ_LOCK01.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: STABLE
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] fixture_lock_exists: /home/user/Treasure_engine/artifacts/fixtures/liq/bybit_ws_v5/v2/lock.json
- [PASS] fixture_raw_exists: /home/user/Treasure_engine/artifacts/fixtures/liq/bybit_ws_v5/v2/raw.jsonl
- [PASS] raw_capture_sha256_matches: raw SHA matches lock — OK
- [PASS] normalized_hash_with_liq_side_matches_lock: hash matches lock (5c05b54961c3deff…) — OK
- [PASS] all_rows_have_valid_liq_side: all 20 rows have valid liq_side — OK
- [PASS] schema_version_is_v2: schema_version=liquidations.bybit_ws_v5.v2
- [PASS] replay_run_a_pass: replay A exit 0 — OK
- [PASS] replay_run_b_pass: replay B exit 0 — OK
- [PASS] replay_script_includes_liq_side: replay script includes liq_side — OK

## FAILED
- NONE
