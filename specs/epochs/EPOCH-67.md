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
- `provider_id`, `lane_id`, `schema_version`
- `raw_capture_sha256` (SHA-256 of `raw.jsonl`)
- `line_count`
- No timestamps as truth in lock (ticks OK in EventBus).

Replay gate: reads `raw.jsonl` + `lock.json`, verifies SHA-256 match,
runs under `TREASURE_NET_KILL=1`.

## EventBus Emissions (tick-only)
Acquire emits: `ACQ_BOOT`, `ACQ_CONNECT`, `ACQ_SUB`, `ACQ_MSG`, `ACQ_SEAL`, `ACQ_ERROR`
Replay emits: `REPLAY_BOOT`, `REPLAY_APPLY`, `REPLAY_SEAL`

## Scripts
| Script | Command |
|--------|---------|
| Acquire (live, needs double-key) | `npm run -s edge:okx:acquire -- --enable-network` |
| Replay (offline) | `npm run -s edge:okx:replay-captured` |
| R3 preflight | `npm run -s verify:r3:preflight` |
| R3 acquire contract | `npm run -s verify:r3:okx-acquire-contract` |

## DoD (Definition of Done)
- [x] `verify:r3:preflight` PASS
- [x] `verify:r3:okx-acquire-contract` PASS (offline proof with fixture)
- [x] `verify:fast` remains PASS (daily loop untouched)
- [x] R3 scripts NOT wired into `verify:fast` or `ops:life`
- [x] Acquire refuses under `TREASURE_NET_KILL=1` (EC=1 CONTRACT)
- [x] Acquire refuses without double-key (EC=2 ACQ_NET00)
- [x] Fixture `artifacts/fixtures/okx/orderbook/acquire_test/` with raw+lock
- [x] Replay validates SHA + line_count under NET_KILL
- [x] EventBus events emitted in deterministic tick order
- [x] No tracked EPOCH files, PR01 guard remains PASS

## R3 Regression Gates
- `RG_R3_OKX01_WRITE_SCOPE`: acquire writes only under `artifacts/incoming/okx/orderbook/**`
- `RG_R3_OKX02_LOCK_FIRST`: lock fields present + SHA matches raw fixture
- `RG_R3_OKX03_EVENTBUS`: replay emits required events in deterministic order
- `RG_R3_OKX04_ALLOWFILE`: double-key guard + hygiene checks

## NOT Wired Into Daily
R3 scripts MUST NOT appear in `verify:fast` or `ops:life`.
Guard: `regression_rg_r3_unlock01_refusal_contract.mjs`.
