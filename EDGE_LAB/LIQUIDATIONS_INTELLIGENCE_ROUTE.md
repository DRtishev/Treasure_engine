# LIQUIDATIONS_INTELLIGENCE_ROUTE.md

STATUS: ACTIVE_P1

## Scope
- Lock-first liquidation lane with offline-authoritative replay.
- Providers: bybit (core), okx/binance (optional expansion).

## Double-key network unlock (required)
- Key-A: CLI `--enable-network`
- Key-B: file `artifacts/incoming/ALLOW_NETWORK` with exact body `ALLOW_NETWORK: YES`
- Missing any key => `NET_REQUIRED` (EC=2).

## Acquire lanes
- bybit: `node scripts/edge/edge_liq_00_acquire_bybit_ws_v5.mjs --provider bybit_ws_v5 --duration-sec <N> --enable-network`
- okx: `node scripts/edge/edge_liq_00_acquire_okx_ws_v5.mjs --duration-sec <N> --enable-network`
- binance: `node scripts/edge/edge_liq_00_acquire_binance_forceorder_ws.mjs --duration-sec <N> --enable-network`

## Replay lane
- `TREASURE_NET_KILL=1 node scripts/edge/edge_liq_01_offline_replay.mjs --provider <id> --run-id <RUN_ID>`

## Artifact paths
- `artifacts/incoming/liquidations/bybit_ws_v5/<RUN_ID>/raw.jsonl`
- `artifacts/incoming/liquidations/bybit_ws_v5/<RUN_ID>/lock.json`
- `artifacts/incoming/liquidations/okx_ws_v5/<RUN_ID>/raw.jsonl`
- `artifacts/incoming/liquidations/okx_ws_v5/<RUN_ID>/lock.json`
- `artifacts/incoming/liquidations/binance_forceorder_ws/<RUN_ID>/raw.jsonl`
- `artifacts/incoming/liquidations/binance_forceorder_ws/<RUN_ID>/lock.json`

## Reason codes
- ACQ_NET00: network unlock missing
- ACQ_NET01: network transport unavailable (NEEDS_NETWORK)
- ACQ_LIQ01: acquisition no data
- ACQ_LIQ03: provider/schema argument contract error
- RDY01: required lane artifacts missing
- RDY02: replay/hash/schema invariant mismatch
- RDY_SCH01: unknown provider schema contract
- ND_LIQ01: replay attempted without net-kill
