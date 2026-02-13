# Execution Truth

## REAL vs PROXY
REAL calibration path is validated by `npm run verify:epoch50` and modules in `core/edge/private_fill_contracts.mjs`.

## Calibration
Execution realism calibration logic resides in `core/edge/execution_realism.mjs`.

## Partial fills and freshness
Partial-fill and freshness scoring are wired through `core/exec/strategy_aware_executor.mjs` and tested in `npm run verify:epoch42`.
