# REAL_PUBLIC_ACQUIRE_CONTRACT.md

## Purpose

Deterministic ACQUIRE-only lane for `REAL_PUBLIC` telemetry generation with multi-provider fallback.

## Deterministic provider policy

- Ordered provider priority is `PROVIDER_ALLOWLIST`.
- Default order: `binance,bybit,okx,kraken`.
- Selection is deterministic: probe providers in listed order and pick the first reachable provider.

## Provider interface requirements

Each provider adapter must implement:

1. `getServerTime()`
2. `probe(symbol, tf)` returning `serverTime` + 3 candles
3. `fetchCandles(symbol, tf, endTime, limit)` full fetch

Canonical row schema (provider-agnostic):

- `ts_open_ms, o, h, l, c, v, symbol, tf`

## Lock-first and x2 behavior

- If lock exists, ACQUIRE must run lock-first (no network).
- If lock is present but dataset artifacts are missing/corrupt => `ACQ05`.
- If runtime attempts provider drift from existing lock => `ACQ03`.
- VERIFY stages are offline-authoritative and must not use network.

## Required lock fields

- `provider_id`, `provider_api_version`
- `server_time_anchor_ms`
- `window_start_ms`, `window_end_ms`
- `tf`, `symbols`
- `hypotheses_sha256`
- `sha256_raw_responses`
- `sha256_norm_dataset`
- `row_count`, `schema_signature`

## Failure diagnostics (ACQ02)

When all providers fail, diagnostics must include per-provider class:

- `DNS`
- `TIMEOUT`
- `ENETUNREACH`
- `TLS`
- `HTTP_4XX`
- `HTTP_5XX`
- `PARSE`

## Command

```bash
ENABLE_NETWORK=1 PROVIDER_ALLOWLIST=binance,bybit,okx,kraken npm run -s edge:profit:00:acquire:public
```
