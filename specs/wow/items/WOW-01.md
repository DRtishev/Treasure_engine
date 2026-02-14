# WOW-01 Point-in-Time Feature Store с Temporal Join Engine

## Mechanism
Point-in-Time Feature Store с Temporal Join Engine improves decision quality through deterministic implemented controls.

## Profit Hook
- Layer: DATA
- Expected effect: Improves risk-adjusted PnL decisions by tightening filters, sizing, and release confidence.

## Integration
- Epochs: 31
- Gates: `verify:epoch31`, `verify:edge`
- Modules:
  - `core/edge/runtime.mjs`
  - `scripts/verify/epoch31_edge_gate.mjs`

## Verification
- Run listed gates and require deterministic PASS x2 in CI mode for release gates.

## Evidence Outputs
- `SUMMARY.md`
- `VERDICT.md`

## Self-Deception Risks
- Backtest-only gains that fail in replay/live-like paths
- Metric cherry-picking that hides tail-risk degradation

## Kill Criteria
- No measurable improvement in acceptance metrics across two deterministic runs
- Introduces regression in determinism or risk hard-stop gates

## Monitoring
- Track acceptance metrics: fitness_score_v2 variance stability, worst_scenario score, max_dd control
- Guardrails: determinism, vault policy, hard-stops, offline-default

## Next Iterations
- Expand deterministic test vectors and evidence references before status promotion.
