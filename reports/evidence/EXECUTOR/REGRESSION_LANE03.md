# REGRESSION_LANE03.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 692d9de68bc6
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] registry_exists: /home/user/Treasure_engine/specs/data_lanes.json
- [PASS] no_duplicate_schema_versions: all 4 schema_versions unique — OK
- [PASS] schema_version_format_valid: all schema_versions match <category>.<provider>.v<N> — OK
- [PASS] liq_binance_forceorder_ws_schema_version_in_script: "liquidations.binance_forceorder_ws.v1" found in scripts/edge/edge_liq_01_offline_replay.mjs — OK
- [PASS] liq_bybit_ws_v5_schema_version_in_script: "liquidations.bybit_ws_v5.v2" found in scripts/edge/edge_liq_01_offline_replay.mjs — OK
- [PASS] liq_okx_ws_v5_schema_version_in_script: "liquidations.okx_ws_v5.v1" found in scripts/edge/edge_liq_01_offline_replay.mjs — OK
- [PASS] price_offline_fixture_schema_version_in_script: "price_bars.offline_fixture.v1" found in scripts/edge/edge_price_01_offline_replay.mjs — OK

## FAILED
- NONE
