# Execution Truth

## REAL vs PROXY
Execution mode must be explicit; defaults stay safe and offline-compatible.

## Calibration
Execution realism parameters are calibrated against verified evidence.

## Partial fills and freshness
Fill logic and freshness windows are part of executable contracts.

## Canonical pointers
- `core/exec/mode_aware_executor.mjs`
- `core/edge/execution_realism.mjs`
- `scripts/verify/epoch42_execution_realism.mjs`
- `docs/DEPLOYMENT_GUIDE.md`

## Operator checklist
- `npm run verify:epoch42`
- `npm run verify:epoch50`
- `npm run verify:treasure`

## Failure modes
- Mode confusion causes accidental REAL-path assumptions.
- Calibration drifts from collected fills.
- Partial-fill edge cases not covered by deterministic vectors.
