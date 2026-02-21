# PORTFOLIO_POLICY.md — Portfolio Court Policy

epoch: PORTFOLIO_COURT_V1
version: 1.0.0
last_updated: 2026-02-21

## Purpose

Defines portfolio-level validation requirements for multi-candidate deployment.
Ensures candidates are sufficiently uncorrelated, each positive-Kelly, and
portfolio-level metrics justify the diversification structure.

---

## Reason Codes

| Code | Name | Exit |
|------|------|------|
| V001 | EVIDENCE_GATE_NOT_PASS | NEEDS_DATA (exit 0) |
| V002 | CORRELATION_TOO_HIGH | BLOCKED (exit 1) |
| V003 | KELLY_FRACTION_NOT_POSITIVE | BLOCKED (exit 1) |
| V004 | PORTFOLIO_SHARPE_BELOW_MIN | BLOCKED (exit 1) |
| NONE | PASS | exit 0 |

---

## 1. Dependency Gate

REQUIRED (NEEDS_DATA if missing or not PASS):
- gates/manual/expectancy_ci.json status = PASS

---

## 2. Per-Candidate Kelly Fraction

Full Kelly formula (binary outcome approximation):
```
b = avg_winner_pct / |avg_loser_pct|    (payout ratio)
f = (win_rate * b - loss_rate) / b      (full Kelly)
f_half = f / 2                          (half-Kelly, operational)
```

Gate: f > 0 for ALL candidates (V003 if any ≤ 0)

Half-Kelly is used for operational position sizing (risk management buffer).

---

## 3. Pairwise Correlation Gate

Pairwise return correlations are estimated using seeded XorShift32 simulation
(strategy-specific seeds derived from evidence_hash) since live trade returns
are not yet available. This is a conservative PROXY — real correlations must
be measured during micro-live phase.

Gate: max_pairwise_correlation < 0.70 (V002 if exceeded)

Rationale:
- Correlation > 0.70 → candidates are functionally the same strategy
- Diversification benefit collapses above 0.70 threshold
- Below 0.70: portfolio vol < weighted average of individual vols

---

## 4. Portfolio Sharpe Gate

Portfolio Sharpe estimated from:
- Per-candidate expectancy (from paper_evidence.json)
- Simulated correlation matrix (seeded)
- Equal-weight assumption at half-Kelly sizing

Gate: portfolio_sharpe >= 1.0 (V004 if below)

---

## 5. REGIME_MATRIX Integration

See REGIME_MATRIX.md for per-candidate market regime suitability.
The portfolio court uses the regime matrix to check that candidates
cover diverse market regimes (not all TRENDING or all RANGE_BOUND).

Gate: min 2 distinct optimal regimes represented (informational, not blocking).

---

## 6. PASS Conditions

| Condition | Verdict |
|-----------|---------|
| All Kelly > 0 + max_corr < 0.70 + portfolio_sharpe >= 1.0 | PASS |
| Any Kelly ≤ 0 | BLOCKED (V003) |
| max_pairwise_correlation ≥ 0.70 | BLOCKED (V002) |
| portfolio_sharpe < 1.0 | BLOCKED (V004) |
| expectancy_ci not PASS | NEEDS_DATA (V001) |

---

## 7. Position Sizing Policy

| Mode | Formula | Max Per-Candidate Notional |
|------|---------|--------------------------|
| MICRO_LIVE | half_kelly × min_capital | 5% of capital |
| PAPER | half_kelly (unrestricted) | 100% of capital (paper) |
| LIVE | half_kelly × risk_budget | 10% of capital |

Maximum portfolio notional exposure = sum(all positions) ≤ 80% of capital.

---

## 8. MCL Notes

FRAME: Is the 4-candidate portfolio diversified and collectively worth running?
RISKS: Simulated correlations are PROXY only; real correlations must be validated in micro-live.
CONTRACT: edge_portfolio_court.mjs reads paper_evidence.json + expectancy_ci.json.
MIN-DIFF: Advisory court (informs portfolio sizing); does not gate micro:live:readiness for MVP.
PROOF: Run npm run edge:portfolio; expect STATUS=PASS.
