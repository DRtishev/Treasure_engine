# OKX Orderbook R3: Live Acquire Research

> EPOCH-R3 research document. Source: OKX API docs + `specs/data_capabilities.json`.

---

## WS Endpoint

- **Public**: `wss://ws.okx.com:8443/ws/v5/public`
- Auth: NOT required for public orderbook data

## Channels

| Channel | Depth | Push Freq | Use Case |
|---------|-------|-----------|----------|
| `books5` | 5 levels | ~100ms | Default — lightweight, fast |
| `books` | 400 levels | ~100ms | Full depth |
| `books-l2-tbt` | 400 levels | tick-by-tick | Highest fidelity |
| `books50-l2-tbt` | 50 levels | tick-by-tick | Medium depth, TBT |

**Default channel**: `books5` (used in acquire script)

## Subscribe Message

```json
{
  "op": "subscribe",
  "args": [{ "channel": "books5", "instId": "BTC-USDT" }]
}
```

## Message Format

### Snapshot (first message)

```json
{
  "action": "snapshot",
  "arg": { "channel": "books5", "instId": "BTC-USDT" },
  "data": [{
    "asks": [["50000", "1.0", "0", "1"], ["50100", "0.5", "0", "1"]],
    "bids": [["49900", "0.8", "0", "1"], ["49800", "0.3", "0", "1"]],
    "seqId": 1000,
    "prevSeqId": -1
  }]
}
```

### Update (subsequent)

```json
{
  "action": "update",
  "arg": { "channel": "books5", "instId": "BTC-USDT" },
  "data": [{
    "asks": [["50200", "0.2", "0", "1"]],
    "bids": [["49900", "0", "0", "1"]],
    "seqId": 1001,
    "prevSeqId": 1000
  }]
}
```

- Entry format: `[price, size, checksum, count]` — all strings
- Size `"0"` = delete level
- `prevSeqId: -1` = snapshot (first message)
- `prevSeqId == lastSeqId` = normal apply
- `prevSeqId > lastSeqId` = GAP (fatal)
- `prevSeqId < lastSeqId` = RESET (re-snapshot path)

## Sequencing

- **Checksum**: deprecated (demo May 2026, prod Aug 2026)
- **seqId/prevSeqId**: primary integrity mechanism
- **dedup_key**: `seqId` (from `data_capabilities.json`)
- **seq_no_update_supported**: true
- **seq_reset_possible**: true
- **reorder_window_max_items**: 5

## Rate Limits (from data_capabilities.json)

| Limit | Value |
|-------|-------|
| connections_per_ip | 3 |
| messages_per_connection | 100 |

## Heartbeat

- Server sends ping every ~30s
- Client must respond with pong
- `heartbeat_interval_ms`: 30000

## Double-Key Unlock (Network Doctrine)

Live acquire requires BOTH:
1. `--enable-network` flag in process.argv
2. `artifacts/incoming/ALLOW_NETWORK` file with content `ALLOW_NETWORK: YES`

Under `TREASURE_NET_KILL=1`: exit code 1 (contract violation).
Missing double-key: exit code 2 (NEEDS_NETWORK).

## Acquire Script

**File**: `scripts/edge/edge_okx_orderbook_10_acquire_live.mjs`

```bash
# Unlock + acquire
echo "ALLOW_NETWORK: YES" > artifacts/incoming/ALLOW_NETWORK
node scripts/edge/edge_okx_orderbook_10_acquire_live.mjs \
  --enable-network --duration-sec 30 --inst-id BTC-USDT
rm artifacts/incoming/ALLOW_NETWORK
```

**Output**:
- `artifacts/incoming/okx/orderbook/<RUN_ID>/raw.jsonl` — raw WS frames
- `artifacts/incoming/okx/orderbook/<RUN_ID>/lock.json` — SEAL-ONLY, always FINAL

**Lock fields**: `schema_version`, `provider_id`, `lane_id`, `lock_state`, `inst_id`,
`depth_level`, `raw_capture_sha256`, `line_count`

## Replay Pipeline

```
acquire (live) → raw.jsonl + lock.json
  → edge_okx_orderbook_11_replay_captured.mjs  (validate lock + sha)
  → edge_okx_orderbook_01_offline_replay.mjs    (seq-state machine)
  → edge_okx_orderbook_02_align_offline.mjs     (alignment engine)
```

## Lane Registry Integration

Lane `price_okx_orderbook_ws` in `specs/data_lanes.json`:
- `lane_state`: EXPERIMENTAL (promoted from PREFLIGHT)
- `acquire_command`: points to `edge_okx_orderbook_10_acquire_live.mjs`
- `replay_command`: points to `edge_okx_orderbook_11_replay_captured.mjs`
