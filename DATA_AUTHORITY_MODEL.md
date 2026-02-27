# DATA_AUTHORITY_MODEL.md

STATUS: ACTIVE

## SSOT: LIQUIDATIONS LANE (P1)

- required_providers (CORE):
  - `bybit_ws_v5`
- optional_providers:
  - `okx_ws_v5`
  - `binance_forceorder_ws`

## Network unlock doctrine (double-key, fail-closed)

Acquire network is allowed only when BOTH are present:
1. CLI flag `--enable-network`
2. File `artifacts/incoming/ALLOW_NETWORK` with exact content: `ALLOW_NETWORK: YES`

If either key is missing, acquire MUST return EC=2 with `NET_REQUIRED`.

## Provider contracts

### bybit_ws_v5
- schema_version: `liquidations.bybit_ws_v5.v1`
- required_artifacts:
  - `artifacts/incoming/liquidations/bybit_ws_v5/<RUN_ID>/raw.jsonl`
  - `artifacts/incoming/liquidations/bybit_ws_v5/<RUN_ID>/lock.json`

### okx_ws_v5
- schema_version: `liquidations.okx_ws_v5.v1`
- required_artifacts:
  - `artifacts/incoming/liquidations/okx_ws_v5/<RUN_ID>/raw.jsonl`
  - `artifacts/incoming/liquidations/okx_ws_v5/<RUN_ID>/lock.json`

### binance_forceorder_ws
- schema_version: `liquidations.binance_forceorder_ws.v1`
- required_artifacts:
  - `artifacts/incoming/liquidations/binance_forceorder_ws/<RUN_ID>/raw.jsonl`
  - `artifacts/incoming/liquidations/binance_forceorder_ws/<RUN_ID>/lock.json`

## Lock contract (required keys)

- `provider_id`
- `schema_version`
- `time_unit_sentinel` (`ms`)
- `raw_capture_sha256`
- `normalized_schema_sha256` (deep-sorted canonical JSON)
- `captured_at_utc` (volatile)

## Invariants (fail-closed)

1. raw/lock coexist in one run dir.
2. `raw_capture_sha256` matches exact `raw.jsonl` bytes.
3. `normalized_schema_sha256` matches canonical normalized payload.
4. `provider_id` + `schema_version` + `time_unit_sentinel` match provider registry.
5. Offline replay requires `TREASURE_NET_KILL=1`.
6. Missing required provider data => `RDY01` (NEEDS_DATA).
7. Replay/hash/schema mismatch => `RDY02` (FAIL).

## Time-unit doctrine

- All lane timestamps are milliseconds (`ms`).
- Any non-`ms` sentinel is invalid.
