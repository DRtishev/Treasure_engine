# Risk Truth

## Risk Fortress
Hard controls are implemented in `core/edge/risk_fortress.mjs`.

## Hard stops
Per-trade/day/week governors must pass `npm run verify:epoch44`.

## Pause and recover
Pause/recover determinism and guardrails are validated through epoch evidence and `npm run verify:edge`.
