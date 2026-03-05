# R2.3 Paper-Live Parity Score Proof

## Gate: RG_PARITY_SCORE_FAST01 + RG_PARITY_E2E02

### Implementation

- `core/recon/parity_score.mjs`: NEW module
- `computeParityScore(paper, live, thresholds)` compares 4 dimensions:
  - fee, slippage, fill_rate, pnl
- Returns `composite_parity_score` (0-100) and per-dimension verdicts

### Evidence

- Fast gate (contract): verifies `computeParityScore` export exists and returns 0-100
- Deep gate (E2E): perfect match → 100, degraded → <100, each dimension scored correctly

### Verdict: PASS
