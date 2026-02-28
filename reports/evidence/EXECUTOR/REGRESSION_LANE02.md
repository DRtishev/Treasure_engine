# REGRESSION_LANE02.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: 692d9de68bc6
NEXT_ACTION: npm run -s verify:fast

## CHECKS
- [PASS] registry_exists: /home/user/Treasure_engine/specs/data_lanes.json
- [PASS] liq_binance_forceorder_ws_replay_script_exists: scripts/edge/edge_liq_01_offline_replay.mjs
- [PASS] liq_binance_forceorder_ws_replay_cmd_has_netkill: TREASURE_NET_KILL=1 present — OK
- [PASS] liq_binance_forceorder_ws_replay_script_no_network: no network calls in replay — OK
- [PASS] liq_bybit_ws_v5_replay_script_exists: scripts/edge/edge_liq_01_offline_replay.mjs
- [PASS] liq_bybit_ws_v5_replay_cmd_has_netkill: TREASURE_NET_KILL=1 present — OK
- [PASS] liq_bybit_ws_v5_replay_script_no_network: no network calls in replay — OK
- [PASS] liq_okx_ws_v5_replay_script_exists: scripts/edge/edge_liq_01_offline_replay.mjs
- [PASS] liq_okx_ws_v5_replay_cmd_has_netkill: TREASURE_NET_KILL=1 present — OK
- [PASS] liq_okx_ws_v5_replay_script_no_network: no network calls in replay — OK
- [PASS] price_offline_fixture_replay_script_exists: scripts/edge/edge_price_01_offline_replay.mjs
- [PASS] price_offline_fixture_replay_cmd_has_netkill: TREASURE_NET_KILL=1 present — OK
- [PASS] price_offline_fixture_replay_script_no_network: no network calls in replay — OK

## FAILED
- NONE
