# WOW-14 CPCV (Combinatorial Purged Cross-Validation) Pipeline (MOONSHOT)

## Mechanism
CPCV (Combinatorial Purged Cross-Validation) Pipeline (MOONSHOT) improves decision quality through deterministic implemented controls.

## Profit Hook
- Layer: EDGE
- Expected effect: Improves risk-adjusted PnL decisions by tightening filters, sizing, and release confidence.

## Integration
- Epochs: 43
- Gates: `verify:epoch43`, `verify:edge`
- Modules:
  - `core/edge/overfit_defense.mjs`
  - `scripts/verify/epoch43_overfit_defense.mjs`

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
