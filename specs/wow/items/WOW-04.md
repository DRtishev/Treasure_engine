# WOW-04 Partial Fill Simulator с Liquidity Buckets

## Mechanism
Partial Fill Simulator с Liquidity Buckets improves decision quality through deterministic implemented controls.

## Profit Hook
- Layer: EXECUTION
- Expected effect: Improves risk-adjusted PnL decisions by tightening filters, sizing, and release confidence.

## Integration
- Epochs: 42
- Gates: `verify:epoch42`, `verify:edge`
- Modules:
  - `core/edge/execution_realism.mjs`
  - `scripts/verify/epoch42_execution_realism.mjs`

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
