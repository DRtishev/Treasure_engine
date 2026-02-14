# Risk Truth

## Risk Fortress
Risk fortress enforces deterministic constraints during stress.

## Hard stops
Per-trade/day/week kill-switches must hold under all vectors.

## Pause and recover
Recovery paths require explicit reset conditions and auditability.

## Canonical pointers
- `core/edge/risk_fortress.mjs`
- `scripts/verify/epoch44_risk_fortress.mjs`
- `docs/CANARY_POLICY.md`
- `specs/QUALITY_BAR.md`

## Operator checklist
- `npm run verify:epoch44`
- `npm run verify:edge`
- `npm run verify:release`

## Failure modes
- Risk clamps computed but not enforced in executor path.
- Hard-stop counters reset unexpectedly.
- Recovery state leaks across runs.
