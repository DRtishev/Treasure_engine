# System Map

## Data layer
Deterministic ingestion, manifests, and schema checks.

## Edge layer
Runtime contracts and epoch edge gates.

## Execution layer
Mode-aware execution, realism and fill calibration controls.

## Risk layer
Hard-stop governors and drawdown fortification.

## Canary layer
Reason-code based canary governance and monitors.

## Governance layer
Release checks, policy enforcement, and evidence readiness.

## Canonical pointers
- `core/data/`
- `core/edge/`
- `core/exec/`
- `core/risk/`
- `scripts/verify/edge_all_epochs.mjs`

## Operator checklist
- `npm run verify:edge`
- `npm run verify:treasure`
- `npm run verify:release`

## Failure modes
- Layer contracts diverge from implementation.
- Gate map references scripts that no longer exist.
- Release gate passes while a lower layer silently regressed.
