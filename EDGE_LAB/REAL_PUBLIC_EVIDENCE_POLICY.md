# REAL_PUBLIC_EVIDENCE_POLICY.md

STATUS: ACTIVE

## Operator flow (single entrypoint)

- `npm run -s epoch:edge:profit:public:00:x2:node22`
- `npm run -s epoch:edge:profit:public:00:ladder:node22` (deterministic lookback steps: 2d, 7d, 30d, 180d; fail-closed on first non-PASS).
- Network allowed only in ACQUIRE phase under:
  - `ENABLE_NETWORK=1`
  - `PROVIDER_ALLOWLIST=binance,bybit,okx,kraken` (or deterministic subset)
- If ACQ02 occurs, NET_DIAG is the first diagnostic artifact (auto-run by public epoch precheck).
- Optional deterministic override for unstable dual-stack networks: `NET_FAMILY=4`.
- Default mode is auto (diag probes 4 then 6), records `selected_net_family` and locks it in `real_public_market.lock.json`.
- Locked host stickiness: if lock exists, selected host/family are reused; override only with `PUBLIC_ROUTE_OVERRIDE` and/or `NET_FAMILY`.
- Preferred route order: `binance_public_data` -> `binance` -> `bybit` -> `okx` -> `kraken`.
- Binance REST deterministic host pool order: `api.binance.com` -> `api1.binance.com` -> `api2.binance.com` -> `api3.binance.com` -> `data-api.binance.vision`.

## Commit (SSOT evidence only)

- `artifacts/incoming/real_public_market.lock.md`
- `artifacts/incoming/real_public_market.lock.json`
- `reports/evidence/**` gate markdown/json outputs (machine JSON only under `reports/evidence/**/gates/**`)
- `reports/evidence/EDGE_PROFIT_00/PROFILES_INDEX.md`

## Never commit (large mutable datasets)

- `artifacts/incoming/*.csv`
- `artifacts/incoming/*.jsonl`
- live provider dumps or ad-hoc raw blobs
