# REGIME_MATRIX.md — Market Regime Suitability Matrix

epoch: PORTFOLIO_COURT_V1
version: 1.0.0
last_updated: 2026-02-21

## Purpose

Maps each TESTING candidate to expected performance across market regimes.
Used by edge_portfolio_court.mjs to verify regime diversification.
Also informs position sizing decisions during live deployment.

---

## Regime Definitions

| Regime | Definition | BTC Signal Features |
|--------|-----------|-------------------|
| TRENDING | Sustained directional move >2 ATR over 4+ hours | High ADX, consistent VWAP deviation |
| RANGE_BOUND | Price oscillating within defined band; low ATR | Low ADX, VWAP reversion, BB squeeze active |
| VOLATILE | High ATR, rapid direction changes, no clear trend | ATR expansion, volume spikes, wide spreads |
| CHOPPY | Low ATR, no clear pattern, noisy price action | Low ADX, irregular volume, narrow range |

---

## Candidate Regime Suitability

### H_ATR_SQUEEZE_BREAKOUT
| Regime | Suitability | Reason | Position Modifier |
|--------|------------|--------|-----------------|
| TRENDING | OPTIMAL | Breakout continuation strongest in trends | 1.0x half-Kelly |
| VOLATILE | GOOD | Volatility expansions create large breakouts | 0.75x half-Kelly |
| RANGE_BOUND | POOR | False breakouts in consolidation | 0.25x half-Kelly |
| CHOPPY | POOR | No sustained moves post-squeeze | 0.25x half-Kelly |

**Primary regime: TRENDING**

---

### H_BB_SQUEEZE
| Regime | Suitability | Reason | Position Modifier |
|--------|------------|--------|-----------------|
| RANGE_BOUND | OPTIMAL | BB squeeze most reliable in consolidation before breakout | 1.0x half-Kelly |
| VOLATILE | GOOD | Squeeze + volatility expansion = textbook setup | 0.75x half-Kelly |
| TRENDING | MODERATE | Some setups work in pullbacks within trends | 0.5x half-Kelly |
| CHOPPY | POOR | Too many false squeezes in choppy conditions | 0.25x half-Kelly |

**Primary regime: RANGE_BOUND**

---

### H_VWAP_REVERSAL
| Regime | Suitability | Reason | Position Modifier |
|--------|------------|--------|-----------------|
| RANGE_BOUND | OPTIMAL | VWAP acts as magnetic center in ranging markets | 1.0x half-Kelly |
| CHOPPY | GOOD | Reversals to VWAP frequent in low-direction markets | 0.75x half-Kelly |
| VOLATILE | POOR | VWAP deviations can expand without reverting | 0.25x half-Kelly |
| TRENDING | POOR | VWAP keeps drifting; no clear reversion anchor | 0.25x half-Kelly |

**Primary regime: RANGE_BOUND**

---

### H_VOLUME_SPIKE
| Regime | Suitability | Reason | Position Modifier |
|--------|------------|--------|-----------------|
| VOLATILE | OPTIMAL | Volume spikes most predictive in high-vol environments | 1.0x half-Kelly |
| TRENDING | GOOD | Volume spikes confirm trend continuation | 0.75x half-Kelly |
| RANGE_BOUND | MODERATE | Spikes in range often mark range extremes | 0.5x half-Kelly |
| CHOPPY | POOR | Random volume spikes without follow-through | 0.25x half-Kelly |

**Primary regime: VOLATILE**

---

## Regime Coverage Summary

| Regime | Candidates with OPTIMAL rating |
|--------|-------------------------------|
| TRENDING | H_ATR_SQUEEZE_BREAKOUT |
| RANGE_BOUND | H_BB_SQUEEZE, H_VWAP_REVERSAL |
| VOLATILE | H_VOLUME_SPIKE |
| CHOPPY | — (no OPTIMAL candidate) |

**Distinct optimal regimes covered: 3 / 4**

Portfolio gate: min 2 distinct optimal regimes required → PASS (3 covered).

---

## Regime Correlation Implications

| Candidate Pair | Expected Correlation | Rationale |
|----------------|---------------------|-----------|
| H_ATR + H_VOLUME_SPIKE | LOW (~0.15) | Different signal types: squeeze vs spike |
| H_ATR + H_BB_SQUEEZE | MODERATE (~0.35) | Both breakout-oriented, partial overlap |
| H_ATR + H_VWAP_REVERSAL | NEGATIVE-LOW (~-0.10) | Opposite: breakout vs reversion |
| H_BB_SQUEEZE + H_VOLUME_SPIKE | LOW (~0.20) | Range setup vs vol spike |
| H_BB_SQUEEZE + H_VWAP_REVERSAL | MODERATE (~0.30) | Both range-bound focused |
| H_VWAP_REVERSAL + H_VOLUME_SPIKE | NEGATIVE-LOW (~-0.05) | Reversion vs momentum spike |

Expected max pairwise correlation: ~0.35 (H_ATR vs H_BB_SQUEEZE) < 0.70 threshold.

---

## Regime Detection Signals (Pre-Live Implementation)

Before going live, implement regime classification:

```
if ADX > 25 AND slope > 0: regime = TRENDING
elif ADX < 15 AND BB_width < percentile_20: regime = RANGE_BOUND
elif ATR > ATR_MA * 1.5 AND abs(price_change_4h) > 2*ATR: regime = VOLATILE
else: regime = CHOPPY
```

Position modifier applied at trade generation time.
