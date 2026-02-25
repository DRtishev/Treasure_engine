# LIQUIDATIONS_INTELLIGENCE_ROUTE.md

STATUS: DESIGN_ONLY

## Scope
- Quarantined MVP scaffold for liquidations intelligence.
- Not part of foundation freeze until stability hardening is complete.

## Acquisition lanes
- Offline replay (authoritative default): lock-first verification, no network.
- Live acquire (optional): raw capture into `artifacts/incoming/`, lock emission, replay first.

## Lock schema (required)
- schema_version
- provider_id
- raw_capture_sha256
- normalized_schema_sha256
- time_unit_sentinel (ms/us/ns)
- captured_at_utc (VOLATILE)

## Replay contract
- Replay must validate lock hashes before downstream use.
- OFFLINE_REPLAY=1 must pass with TREASURE_NET_KILL=1 and preload active.

## Reason codes
- ACQ_LIQ01: acquisition blocked / data missing
- ACQ_LIQ02: rate limited
- ACQ_LIQ03: schema drift
- DATA_LIQ01: content mismatch
- ND_LIQ01: nondeterminism or offline contract violation

## OFFLINE_REPLAY smoke
- `OFFLINE_REPLAY=1 TREASURE_NET_KILL=1 node -r <ABS_PRELOAD> scripts/verify/liquidations_smoke_gate.mjs`
- PASS requires lock + raw hash integrity + schema/version validation.
- NEEDS_DATA when lock/raw missing.

## Readiness reason codes (seal authority)
- RDY01: missing lock/raw artifacts (`artifacts/incoming/bybit_liq.lock.json`, `artifacts/incoming/bybit_liq.raw.json`).
- RDY02: lock hash/schema mismatch (`schema_version=liq.lock.v1` expected).
- RDY_NET01: offline replay failed under net-kill.
- RDY_SCH01: readiness provider registry/schema contract invalid.
