# EPOCH-67 — R3 OKX Live Acquire Kernel (Double-Key)

## Goal
Enable live OKX orderbook/liquidation data acquisition with strict double-key
unlock doctrine. All CERT lanes remain offline (TREASURE_NET_KILL=1).
Network access only through explicit unlock: `--enable-network` flag +
`artifacts/incoming/ALLOW_NETWORK` file with content `ALLOW_NETWORK: YES`.

## Acceptance (falsifiable)
- `npm run -s verify:r3:preflight` PASS — contract checks green.
- `npm run -s verify:r3:okx-acquire-contract` PASS — acquire/replay/lock.
- Acquire writes `raw.jsonl` + `lock.json` under `artifacts/incoming/okx/`.
- Offline replay under `TREASURE_NET_KILL=1` passes using captured data.
- `npm run -s verify:fast` remains PASS (R3 NOT wired into daily).
- No EPOCH-VICTORY or EPOCH-LIFE regression from R3 scripts.

## Unlock Doctrine
1. **CERT lane**: `TREASURE_NET_KILL=1` always set. `net_kill_preload.cjs`
   injected via `NODE_OPTIONS`. All network calls throw `NETV01`.
2. **ACQUIRE lane**: requires TWO keys simultaneously:
   - File: `artifacts/incoming/ALLOW_NETWORK` with exact content `ALLOW_NETWORK: YES`
   - Flag: `--enable-network` in `process.argv`
3. Failure mode: `EC=2`, `reason_code=ACQ_NET00`, message `NET_REQUIRED`.

## Run Order
```
npm run -s verify:r3:preflight            # contract proof
npm run -s verify:r3:okx-acquire-contract # acquire + replay + lock
npm run -s verify:fast                    # daily still green
```

## Artifacts
- `artifacts/incoming/okx/orderbook/<run_id>/raw.jsonl`
- `artifacts/incoming/okx/orderbook/<run_id>/lock.json`
- `reports/evidence/EXECUTOR/R3_PREFLIGHT.md`
- `reports/evidence/EXECUTOR/gates/manual/r3_preflight.json`

## Lock-First Contract
Every acquire run MUST produce `lock.json` with:
- `provider_id`, `schema_version`, `time_unit_sentinel`
- `raw_capture_sha256` (SHA-256 of `raw.jsonl`)
- `captured_at_utc` (ISO 8601)

Replay gate: reads `raw.jsonl` + `lock.json`, verifies SHA-256 match,
runs under `TREASURE_NET_KILL=1`.

## NOT Wired Into Daily
R3 scripts MUST NOT appear in `verify:fast` or `ops:life`.
Guard: `regression_rg_r3_unlock01_refusal_contract.mjs`.
