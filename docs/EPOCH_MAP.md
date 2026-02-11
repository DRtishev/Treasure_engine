# EPOCH MAP — Spec vs Legacy Naming

## Why this file exists
The repository contains both **spec epochs** (`EPOCH-17..EPOCH-26`) and older **legacy runtime/evidence labels** (`EPOCH-04`, `EPOCH-06`, etc.).
This map prevents confusion when reading logs and gate outputs.

## Spec epoch chain (authoritative for autopilot)
- EPOCH-17 → safety-integrated executor
- EPOCH-18 → strategy layer
- EPOCH-19 → governance FSM
- EPOCH-20 → monitoring/performance
- EPOCH-21 → release governor
- EPOCH-22 → AI validation harness
- EPOCH-23 → signal-to-intent contract
- EPOCH-24 → walk-forward reality gap
- EPOCH-25 → testnet campaign (opt-in network)
- EPOCH-26 → micro-live governor rehearsal

## Legacy labels still visible in runtime scripts/logs
- `EPOCH-04` appears in paper E2E output banner.
- `EPOCH-06` appears in older truth-layer/e2 orchestration labels.
- `EPOCH-16` appears in integration test banner.

These labels are historical runtime names and do not replace the spec epoch chain.

## Gate-to-spec mapping
- `verify:paper` → baseline invariant used by all spec epochs.
- `verify:e2`, `verify:e2:multi` → baseline invariant + stability used by all spec epochs.
- `verify:epoch17` → EPOCH-17 primary gate.
- `verify:epoch18` / `verify:strategy` → EPOCH-18.
- `verify:epoch19` / `verify:governance` → EPOCH-19.
- `verify:epoch20` / `verify:monitoring` → EPOCH-20.
- `verify:epoch21` / `verify:release-governor` → EPOCH-21.
- `verify:epoch22` → EPOCH-22.
- `verify:epoch23` → EPOCH-23.
- `verify:epoch24` → EPOCH-24.
- `verify:epoch25` → EPOCH-25.
- `verify:epoch26` → EPOCH-26.

## Operational rule
When deciding next implementation target, always follow:
1. `specs/epochs/INDEX.md` dependency chain,
2. `specs/epochs/LEDGER.json` status (`DONE/READY/BLOCKED`).
