# REGISTRY_COURT.md — Registry Validation Report
generated_at: 295c8a87115b
script: edge_registry.mjs

## STATUS: PASS

## Summary
| Metric | Value |
|--------|-------|
| Total hacks in registry | 20 |
| Schema compliant | 20 |
| Schema violations | 0 |
| Schema file present | YES |
| Registry file present | YES |
| Minimum hack count (>=10) | PASS |

## Status Distribution
| Status | Count |
|--------|-------|
| TESTING | 4 |
| DRAFT | 12 |
| NEEDS_DATA | 4 |

## Dependency Class Distribution
| dependency_class | Count |
|-----------------|-------|
| OHLCV | 16 |
| EXTERNAL | 4 |

## Truth Tag Distribution
| truth_tag | Count |
|-----------|-------|
| TRUE_DATA | 14 |
| PROXY_DATA | 2 |
| UNAVAILABLE | 4 |

## Schema Compliance Results
| hack_id | status | dep_class | truth_tag | trials | schema | issues |
|---------|--------|-----------|-----------|--------|--------|--------|
| H_ATR_SQUEEZE_BREAKOUT | TESTING | OHLCV | TRUE_DATA | 47 | OK | None |
| H_BB_SQUEEZE | TESTING | OHLCV | TRUE_DATA | 38 | OK | None |
| H_VWAP_REVERSAL | TESTING | OHLCV | TRUE_DATA | 52 | OK | None |
| H_VOLUME_SPIKE | TESTING | OHLCV | TRUE_DATA | 41 | OK | None |
| H_VOLUME_CLIMAX | DRAFT | OHLCV | TRUE_DATA | 0 | OK | None |
| H_MM_TRAP_FALSE_BREAK | DRAFT | OHLCV | TRUE_DATA | 0 | OK | None |
| H_LIQUIDITY_VOID_PROXY | DRAFT | OHLCV | PROXY_DATA | 0 | OK | None |
| H_OBV_DIVERGENCE | DRAFT | OHLCV | PROXY_DATA | 0 | OK | None |
| H_EQUITY_CURVE_THROTTLE | DRAFT | OHLCV | TRUE_DATA | 0 | OK | None |
| H_FUNDING_TIMING | NEEDS_DATA | EXTERNAL | UNAVAILABLE | 0 | OK | None |
| H_RSI_DIVERGENCE | DRAFT | OHLCV | TRUE_DATA | 0 | OK | None |
| H_MACD_CROSS | DRAFT | OHLCV | TRUE_DATA | 0 | OK | None |
| H_RANGE_COMPRESSION | DRAFT | OHLCV | TRUE_DATA | 0 | OK | None |
| H_TREND_CONTINUATION | DRAFT | OHLCV | TRUE_DATA | 0 | OK | None |
| H_MEAN_REVERSION | DRAFT | OHLCV | TRUE_DATA | 0 | OK | None |
| H_GAP_FILL | DRAFT | OHLCV | TRUE_DATA | 0 | OK | None |
| H_BREAKOUT_RETEST | DRAFT | OHLCV | TRUE_DATA | 0 | OK | None |
| H_OPEN_INTEREST_SURGE | NEEDS_DATA | EXTERNAL | UNAVAILABLE | 0 | OK | None |
| H_LIQUIDATION_CASCADE | NEEDS_DATA | EXTERNAL | UNAVAILABLE | 0 | OK | None |
| H_SENTIMENT_EXTREME | NEEDS_DATA | EXTERNAL | UNAVAILABLE | 0 | OK | None |

## Hack List
1. H_ATR_SQUEEZE_BREAKOUT
2. H_BB_SQUEEZE
3. H_VWAP_REVERSAL
4. H_VOLUME_SPIKE
5. H_VOLUME_CLIMAX
6. H_MM_TRAP_FALSE_BREAK
7. H_LIQUIDITY_VOID_PROXY
8. H_OBV_DIVERGENCE
9. H_EQUITY_CURVE_THROTTLE
10. H_FUNDING_TIMING
11. H_RSI_DIVERGENCE
12. H_MACD_CROSS
13. H_RANGE_COMPRESSION
14. H_TREND_CONTINUATION
15. H_MEAN_REVERSION
16. H_GAP_FILL
17. H_BREAKOUT_RETEST
18. H_OPEN_INTEREST_SURGE
19. H_LIQUIDATION_CASCADE
20. H_SENTIMENT_EXTREME

## Verdict
All 20 hacks validated. Schema compliance: 20/20. Registry court PASSED.
