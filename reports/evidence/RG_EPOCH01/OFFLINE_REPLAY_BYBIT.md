# OFFLINE_REPLAY_BYBIT.md

STATUS: PASS
REASON_CODE: NONE

## Command
- `TREASURE_NET_KILL=1 node scripts/edge/edge_liq_01_offline_replay.mjs --run-id P1_FIXTURE_0001` => EC=0

## Assertions
- `provider_id == bybit_ws_v5`
- `schema_version == liquidations.bybit_ws_v5.v1`
- `time_unit_sentinel == ms`
- `raw_capture_sha256` match: PASS
- `normalized_schema_sha256` match (deep-sorted canonical JSON): PASS
- net-kill required: PASS

## Logs
- `reports/evidence/RG_EPOCH01/logs/offline_replay.log`
