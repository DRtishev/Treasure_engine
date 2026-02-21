# PORTFOLIO_COURT.md — EPOCH P5 Portfolio Court
generated_at: b4de92324329
script: edge_portfolio_court.mjs

## STATUS: PASS

## Reason Code
NONE

## Per-Candidate Kelly Analysis

| Candidate | n | win_rate | avg_winner% | avg_loser% | b (payout) | full_kelly | half_kelly | Gate |
|-----------|---|---------|------------|-----------|------------|-----------|-----------|------|
| H_ATR_SQUEEZE_BREAKOUT | 35 | 0.5714 | 1.5455 | -0.6133 | 2.520 | 0.4013 | 0.2007 | PASS |
| H_BB_SQUEEZE | 35 | 0.5714 | 1.526 | -0.6173 | 2.472 | 0.3980 | 0.1990 | PASS |
| H_VOLUME_SPIKE | 35 | 0.5714 | 1.4415 | -0.6027 | 2.392 | 0.3922 | 0.1961 | PASS |
| H_VWAP_REVERSAL | 35 | 0.5714 | 1.307 | -0.464 | 2.817 | 0.4192 | 0.2096 | PASS |

## Pairwise Correlation Matrix (Seeded Simulation, n=1000 trades/pair)

| Pair | Simulated Corr | Gate |
|------|---------------|------|
| H_ATR_SQUEEZE_BREAKOUT ↔ H_BB_SQUEEZE | 0.0217 | PASS |
| H_ATR_SQUEEZE_BREAKOUT ↔ H_VOLUME_SPIKE | 0.0378 | PASS |
| H_ATR_SQUEEZE_BREAKOUT ↔ H_VWAP_REVERSAL | -0.0437 | PASS |
| H_BB_SQUEEZE ↔ H_VOLUME_SPIKE | -0.0443 | PASS |
| H_BB_SQUEEZE ↔ H_VWAP_REVERSAL | -0.0564 | PASS |
| H_VOLUME_SPIKE ↔ H_VWAP_REVERSAL | -0.0023 | PASS |

Max pairwise correlation: **0.0378** (threshold < 0.7)

## Portfolio Metrics

| Metric | Value | Gate |
|--------|-------|------|
| Portfolio Sharpe (equal-weight half-Kelly) | 1.1849 | PASS |
| Portfolio expected return | 0.5852% | — |
| Diversification ratio | 2.0334 | — |
| Max per-candidate half-Kelly | 0.2096 | — |
| Min per-candidate half-Kelly | 0.1961 | — |
| Optimal regimes covered | 3 / 4 | PASS |

## Policy

EDGE_LAB/PORTFOLIO_POLICY.md — version 1.0.0
EDGE_LAB/REGIME_MATRIX.md — version 1.0.0

## Gate Dependency Chain

PAPER_EVIDENCE_COURT (P0) → EXPECTANCY_CI_COURT (P1) → PORTFOLIO_COURT (P5)

## NEXT_ACTION

Portfolio diversification PASS. Proceed with equal-weight half-Kelly sizing in micro-live.
