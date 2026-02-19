# OVERFIT_COURT_RULES.md — Overfit Detection Rules
version: 1.0.0 | last_updated: 2026-02-19

## Purpose

Defines the rules used by the Overfit Court to detect and reject overfit strategies. These rules are enforced by the edge:overfit script. A hack fails the Overfit Court if ANY hard rule is violated.

---

## Court Structure

The Overfit Court evaluates three categories of overfit risk:
1. **Parameter overfit** (too many parameters, too few trades)
2. **Temporal overfit** (curve-fit to specific historical periods)
3. **Selection bias** (cherry-picked results)

---

## Hard Rules (Automatic FAIL)

### Rule H-01: Minimum Trades Requirement
```
Requirement: OOS trade count >= 30 per OOS period
Violation: OVERFIT_INSUFFICIENT_TRADES
Action: FAIL — NOT_ELIGIBLE
Rationale: Fewer than 30 OOS trades provides statistically unreliable Sharpe estimates
```

### Rule H-02: Degrees of Freedom
```
Requirement: OOS_trades_per_IS_period >= 10 * num_parameters
Violation: OVERFIT_LOW_DOF
Action: FAIL — NOT_ELIGIBLE
Rationale: Prado (2018) rule of thumb: 10+ trades per degree of freedom
Example: Strategy with 5 params needs 50+ trades per OOS period
```

### Rule H-03: OOS Sharpe Minimum
```
Requirement: All OOS window Sharpe ratios >= 0.5
Violation: OVERFIT_NEGATIVE_OOS
Action: FAIL — NOT_ELIGIBLE
Rationale: Negative OOS Sharpe means the strategy lost money on unseen data
```

### Rule H-04: IS-OOS Degradation Limit
```
Requirement: OOS_Sharpe >= 0.5 * IS_Sharpe
Violation: OVERFIT_IS_OOS_COLLAPSE
Action: FAIL — NOT_ELIGIBLE
Rationale: > 50% degradation from IS to OOS indicates significant overfitting
```

### Rule H-05: No Zero-Trial Hacks in TESTING Status
```
Requirement: hacks with status==TESTING must have trials_count >= 10
Violation: OVERFIT_TRIALS_UNTRACKED
Action: FAIL — block TESTING status until trials are completed
Rationale: TESTING status without optimization evidence is meaningless
```

### Rule H-06: OOS Consistency
```
Requirement: At least 75% of OOS windows must be profitable (positive Sharpe)
Violation: OVERFIT_OOS_INCONSISTENCY
Action: FAIL — NOT_ELIGIBLE
Rationale: A strategy that works in some periods but not others lacks robustness
```

---

## Soft Rules (Warning — Advisory)

### Rule S-01: Maximum Parameters
```
Advisory: num_parameters <= 8
Warning level: OVERFIT_PARAM_COUNT_HIGH
Rationale: More than 8 parameters significantly increases overfit risk
```

### Rule S-02: Parameter Stability
```
Advisory: Optimal params between IS windows must not shift by > 50%
Warning level: OVERFIT_PARAM_INSTABILITY
Rationale: Unstable optimal parameters suggest the signal is not consistent
```

### Rule S-03: IS Sharpe Ceiling
```
Advisory: IS Sharpe should not exceed 3.0 for typical crypto strategies
Warning level: OVERFIT_HIGH_IS_SHARPE
Rationale: Very high IS Sharpe (>3) often indicates look-ahead or overfit
```

### Rule S-04: Win Rate Extremes
```
Advisory: OOS win rate should be between 35% and 75%
Warning level: OVERFIT_WIN_RATE_EXTREME
Rationale: Very high win rates (>80%) may indicate stale-price overfitting
```

### Rule S-05: Drawdown Consistency
```
Advisory: OOS max drawdown should not exceed 2x IS max drawdown
Warning level: OVERFIT_DRAWDOWN_EXPANSION
Rationale: Significant drawdown expansion in OOS may indicate overfit risk periods
```

---

## Special Rules for PROXY_DATA Hacks

### Rule P-01: Proxy Validation
```
Requirement: Proxy correlation > 0.4 with real quantity (where testable)
Violation: PROXY_INSUFFICIENT_CORRELATION
Action: WARN — cannot proceed to ELIGIBLE without validation
```

### Rule P-02: Proxy Failure Mode Documentation
```
Requirement: proxy_failure_modes field must be non-empty
Violation: PROXY_UNDOCUMENTED_FAILURE_MODES
Action: FAIL — block TESTING status
```

### Rule P-03: Proxy OOS Haircut
```
Requirement: For PROXY_DATA hacks, apply additional 20% OOS Sharpe haircut
Required adjusted OOS Sharpe: >= 0.625 (= 0.5 / 0.8)
Violation: PROXY_OOS_SHARPE_INSUFFICIENT_AFTER_HAIRCUT
Action: FAIL — NOT_ELIGIBLE
Rationale: Proxy data introduces structural uncertainty; require higher threshold
```

---

## Special Rules for DRAFT Hacks with trials_count == 0

All DRAFT hacks with trials_count == 0 are flagged with:
```
Flag: OVERFIT_TRIALS_UNTRACKED
Severity: WARNING (not blocking for DRAFT status)
Message: "No optimization trials have been run. Cannot assess overfit risk."
Required action: Schedule trials before advancing to TESTING status
```

Current hacks with this flag:
- H_VOLUME_CLIMAX (DRAFT, 0 trials)
- H_MM_TRAP_FALSE_BREAK (DRAFT, 0 trials)
- H_LIQUIDITY_VOID_PROXY (DRAFT, 0 trials)
- H_OBV_DIVERGENCE (DRAFT, 0 trials)
- H_EQUITY_CURVE_THROTTLE (DRAFT, 0 trials)
- H_RSI_DIVERGENCE (DRAFT, 0 trials)
- H_MACD_CROSS (DRAFT, 0 trials)
- H_RANGE_COMPRESSION (DRAFT, 0 trials)
- H_TREND_CONTINUATION (DRAFT, 0 trials)
- H_MEAN_REVERSION (DRAFT, 0 trials)
- H_GAP_FILL (DRAFT, 0 trials)
- H_BREAKOUT_RETEST (DRAFT, 0 trials)

---

## Combinatorial Overfit Risk

### Bailey-Prado Haircut (PBO Framework)

The Probability of Backtest Overfitting (PBO) must be estimated for hacks with > 1 trial:

```
PBO_estimate = binomial_distribution(n_trials, n_independent_params)
PBO < 0.50: ACCEPTABLE
PBO 0.50-0.70: WARNING
PBO > 0.70: FAIL — high probability this is overfit
```

For hacks in TESTING status with Bayesian optimization:
- Bayesian trials are treated as 0.3x weight vs. grid search trials (correlated)
- Effective trial count = actual_trials * 0.3 (conservative)

---

## Overfit Court Scoring

Each hack receives an Overfit Risk Score (ORS):

| Component | Weight | Max Score |
|-----------|--------|----------|
| H-Rules violations | -50 each | -200 |
| S-Rules violations | -10 each | -50 |
| DOF adequate | +20 | +20 |
| OOS consistency | +20 | +20 |
| Param count <=5 | +10 | +10 |

```
ORS Interpretation:
  ORS > 0: Low overfit risk — PASS
  ORS 0 to -20: Moderate risk — WARNING
  ORS < -20: High overfit risk — FAIL (if any H-Rules violated)
```

---

## Court Outcome

| Outcome | Condition |
|---------|-----------|
| OVERFIT_COURT: PASS | No H-Rules violated; ORS > 0 |
| OVERFIT_COURT: WARNING | No H-Rules violated; ORS 0 to -20 |
| OVERFIT_COURT: FAIL | Any H-Rule violated OR ORS < -20 |
| OVERFIT_COURT: NEEDS_TRIALS | trials_count == 0 for TESTING hacks |
