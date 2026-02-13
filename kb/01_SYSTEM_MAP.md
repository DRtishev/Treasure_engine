# System Map

## Data layer
Primary contracts and manifests in `core/data/` and checks in `npm run verify:repo`.

## Edge layer
Signal/feature logic in `core/edge/` gated by `npm run verify:edge`.

## Execution layer
Execution realism and adapters in `core/exec/` and `core/edge/execution_realism.mjs`.

## Risk layer
Risk fortress controls in `core/edge/risk_fortress.mjs` with `npm run verify:epoch44`.

## Canary layer
Canary controls and forensic checks under `scripts/verify/epoch52_canary_controller.mjs` and `scripts/verify/epoch53_canary_forensics.mjs`.

## Governance layer
Release/evidence controls in `scripts/verify/release_check.mjs` and `scripts/evidence/packager.mjs`.
