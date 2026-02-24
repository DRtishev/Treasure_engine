# REAL_PUBLIC_EVIDENCE_POLICY.md

STATUS: ACTIVE

## Operator flow (single entrypoint)

- `npm run -s epoch:edge:profit:public:00:x2:node22`
- Network allowed only in ACQUIRE phase under:
  - `ENABLE_NETWORK=1`
  - `PROVIDER_ALLOWLIST=binance,bybit,okx,kraken` (or deterministic subset)
- If ACQ02 occurs, NET_DIAG is the first diagnostic artifact (auto-run by public epoch precheck).
- Optional deterministic override for unstable dual-stack networks: `NET_FAMILY=4`.
- Preferred route order: `binance_public_data` -> `binance` -> `bybit` -> `okx` -> `kraken`.

## Commit (SSOT evidence only)

- `artifacts/incoming/real_public_market.lock.md`
- `artifacts/incoming/real_public_market.lock.json`
- `reports/evidence/**` gate markdown/json outputs (machine JSON only under `reports/evidence/**/gates/**`)
- `reports/evidence/EDGE_PROFIT_00/PROFILES_INDEX.md`

## Never commit (large mutable datasets)

- `artifacts/incoming/*.csv`
- `artifacts/incoming/*.jsonl`
- live provider dumps or ad-hoc raw blobs
