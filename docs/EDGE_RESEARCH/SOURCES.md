# EDGE Research Sources (Tiered Evidence Policy)

## Operator Summary
- This bibliography defines admissible evidence for EDGE specs.
- Tier-1 is mandatory for core claims and safety thresholds.
- Tier-2 is allowed for implementation details, not thesis-level claims.
- Blogs/forums/marketing are never accepted as proof.
- Unsourced numbers must be marked **HEURISTIC**.
- Every HEURISTIC requires a documented calibration loop.
- Source relevance must map to a contract, gate, or risk decision.
- If evidence quality is weak, default to conservative controls.
- Regulatory and standards references anchor governance expectations.
- Update this file when adding new threshold logic.

## Where to look next
- Decision trade-offs: `docs/EDGE_RESEARCH/DECISION_MATRIX.md`.
- AI evaluation methods: `docs/EDGE_RESEARCH/AI_MODULE.md`.

## Source policy
- **Tier-1**: peer-reviewed papers, official exchange/broker docs, standards bodies, established technical books.
- **Tier-2**: official engineering/runtime docs from core technology vendors.
- **Forbidden**: Reddit/Quora, social posts, marketing pages, anonymous snippets.

## Bibliography
1. Lopez de Prado, M. *Advances in Financial Machine Learning* (Wiley, 2018). **Tier-1**. Purging/embargo/CPCV foundations.
2. Bailey et al. (2014), “The Probability of Backtest Overfitting.” **Tier-1**. PBO option for overfit court.
3. Bailey & Lopez de Prado (2014), “The Deflated Sharpe Ratio.” **Tier-1**. Multiple-testing aware performance view.
4. White (2000), “A Reality Check for Data Snooping.” **Tier-1**. Selection bias correction option.
5. Hansen (2005), “A Test for Superior Predictive Ability.” **Tier-1**. SPA model comparison option.
6. Hasbrouck, J. *Empirical Market Microstructure*. **Tier-1**. Fill/slippage realism assumptions.
7. Bouchaud & Potters, *Theory of Financial Risk and Derivative Pricing*. **Tier-1**. Heavy-tail and risk sizing context.
8. Official exchange/broker fee schedules (venue-specific). **Tier-1**. Simulator fee calibration anchors.
9. NIST SP 800-53 / related control families. **Tier-1**. Governance, auditability, control framing.
10. Node.js official docs. **Tier-2**. Runtime determinism and execution ordering constraints.
11. SQLite official docs. **Tier-2**. Deterministic local persistence behavior.

## HEURISTIC policy
- Any threshold without Tier-1 backing must be labeled **HEURISTIC**.
- HEURISTIC thresholds require quarterly calibration evidence (data window, objective, selected value, rollback guard).
