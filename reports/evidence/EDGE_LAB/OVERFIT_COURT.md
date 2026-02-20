# OVERFIT_COURT.md — Overfit Detection Report
generated_at: RUN_ID
script: edge_overfit.mjs

## STATUS: PASS

## File Validation
| File | Exists |
|------|--------|
| EDGE_LAB/WALK_FORWARD_PROTOCOL.md | YES |
| EDGE_LAB/OVERFIT_COURT_RULES.md | YES |
| EDGE_LAB/TRIALS_LEDGER.md | YES |
| EDGE_LAB/HACK_REGISTRY.md | YES |

## Walk-Forward Protocol Checks
| Check | Result |
|-------|--------|
| Minimum OOS periods defined | PASS |
| IS:OOS ratio defined | PASS |
| Minimum OOS Sharpe defined | PASS |
| Window types defined (A and B) | PASS |
| Optimization protocol defined | PASS |
| Regime coverage requirements | PASS |
| Data integrity checks | PASS |
| Failure modes documented | PASS |

## Overfit Court Rules Checks
| Check | Result |
|-------|--------|
| Hard Rule H-01 (min trades) | PASS |
| Hard Rule H-02 (degrees of freedom) | PASS |
| Hard Rule H-03 (OOS Sharpe min) | PASS |
| Hard Rule H-04 (IS-OOS degradation) | PASS |
| Hard Rule H-05 (zero-trial hacks) | PASS |
| Soft rules defined | PASS |
| PROXY_DATA special rules | PASS |
| Overfit Risk Score defined | PASS |

## Trials Ledger Checks
| Check | Result |
|-------|--------|
| H_ATR_SQUEEZE_BREAKOUT trial records | PASS |
| H_BB_SQUEEZE trial records | PASS |
| Trial IDs documented | PASS |
| Ledger statistics present | PASS |

## Per-Hack Overfit Assessment
| hack_id | status | trials | overfit_risk | flags | result |
|---------|--------|--------|-------------|-------|--------|
| H_ATR_SQUEEZE_BREAKOUT | TESTING | 47 | LOW | None | OK |
| H_BB_SQUEEZE | TESTING | 38 | LOW | None | OK |
| H_VWAP_REVERSAL | TESTING | 52 | LOW | None | OK |
| H_VOLUME_SPIKE | TESTING | 41 | LOW | None | OK |
| H_VOLUME_CLIMAX | DRAFT | 0 | UNASSESSED | OVERFIT_TRIALS_UNTRACKED | OK |
| H_MM_TRAP_FALSE_BREAK | DRAFT | 0 | UNASSESSED | OVERFIT_TRIALS_UNTRACKED | OK |
| H_LIQUIDITY_VOID_PROXY | DRAFT | 0 | UNASSESSED | OVERFIT_TRIALS_UNTRACKED | OK |
| H_OBV_DIVERGENCE | DRAFT | 0 | UNASSESSED | OVERFIT_TRIALS_UNTRACKED | OK |
| H_EQUITY_CURVE_THROTTLE | DRAFT | 0 | UNASSESSED | OVERFIT_TRIALS_UNTRACKED | OK |
| H_FUNDING_TIMING | NEEDS_DATA | 0 | UNASSESSED | OVERFIT_TRIALS_UNTRACKED | OK |
| H_RSI_DIVERGENCE | DRAFT | 0 | UNASSESSED | OVERFIT_TRIALS_UNTRACKED | OK |
| H_MACD_CROSS | DRAFT | 0 | UNASSESSED | OVERFIT_TRIALS_UNTRACKED | OK |
| H_RANGE_COMPRESSION | DRAFT | 0 | UNASSESSED | OVERFIT_TRIALS_UNTRACKED | OK |
| H_TREND_CONTINUATION | DRAFT | 0 | UNASSESSED | OVERFIT_TRIALS_UNTRACKED | OK |
| H_MEAN_REVERSION | DRAFT | 0 | UNASSESSED | OVERFIT_TRIALS_UNTRACKED | OK |
| H_GAP_FILL | DRAFT | 0 | UNASSESSED | OVERFIT_TRIALS_UNTRACKED | OK |
| H_BREAKOUT_RETEST | DRAFT | 0 | UNASSESSED | OVERFIT_TRIALS_UNTRACKED | OK |
| H_OPEN_INTEREST_SURGE | NEEDS_DATA | 0 | UNASSESSED | OVERFIT_TRIALS_UNTRACKED | OK |
| H_LIQUIDATION_CASCADE | NEEDS_DATA | 0 | UNASSESSED | OVERFIT_TRIALS_UNTRACKED | OK |
| H_SENTIMENT_EXTREME | NEEDS_DATA | 0 | UNASSESSED | OVERFIT_TRIALS_UNTRACKED | OK |

## Zero-Trial Hacks (OVERFIT_TRIALS_UNTRACKED)
The following 16 hacks have zero optimization trials:
- H_VOLUME_CLIMAX
- H_MM_TRAP_FALSE_BREAK
- H_LIQUIDITY_VOID_PROXY
- H_OBV_DIVERGENCE
- H_EQUITY_CURVE_THROTTLE
- H_FUNDING_TIMING
- H_RSI_DIVERGENCE
- H_MACD_CROSS
- H_RANGE_COMPRESSION
- H_TREND_CONTINUATION
- H_MEAN_REVERSION
- H_GAP_FILL
- H_BREAKOUT_RETEST
- H_OPEN_INTEREST_SURGE
- H_LIQUIDATION_CASCADE
- H_SENTIMENT_EXTREME

These are DRAFT or NEEDS_DATA hacks. Flag OVERFIT_TRIALS_UNTRACKED is advisory for DRAFT status.
No TESTING hack has zero trials — H-05 is satisfied.

## Summary Statistics
| Metric | Value |
|--------|-------|
| Total hacks assessed | 20 |
| Zero-trial hacks (DRAFT/NEEDS_DATA) | 16 |
| TESTING hacks without min trials | 0 |
| Critical failures | 0 |
| Warnings | 0 |
| Walk-forward checks passed | 8 / 8 |
| Overfit rule checks passed | 8 / 8 |

## Hard Rule H-05 Compliance
All TESTING hacks must have trials_count >= 10:
- H_ATR_SQUEEZE_BREAKOUT: 47 trials — PASS
- H_BB_SQUEEZE: 38 trials — PASS
- H_VWAP_REVERSAL: 52 trials — PASS
- H_VOLUME_SPIKE: 41 trials — PASS

## Verdict
Overfit court PASSED. 16 DRAFT/NEEDS_DATA hacks flagged OVERFIT_TRIALS_UNTRACKED (advisory only). No TESTING hack violations found.
