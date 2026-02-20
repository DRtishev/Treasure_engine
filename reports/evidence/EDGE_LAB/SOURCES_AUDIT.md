# SOURCES_AUDIT.md — Data Sources Quality Audit
generated_at: RUN_ID
script: edge_sources.mjs

## STATUS: PASS

## File Validation
| File | Exists | Status |
|------|--------|--------|
| EDGE_LAB/SOURCES_POLICY.md | YES | PASS |
| EDGE_LAB/RESEARCH_INTAKE.md | YES | PASS |

## SOURCES_POLICY.md Section Checks
| Section | Status |
|---------|--------|
| Tier 1 / TRUE_DATA section | PASS |
| Tier 2 / PROXY_DATA section | PASS |
| Tier 3 / EXTERNAL section | PASS |
| Binance OHLCV documented | PASS |
| Quality standards defined | PASS |
| Onboarding process defined | PASS |
| Prohibited practices listed | PASS |

## RESEARCH_INTAKE.md Section Checks
| Section | Status |
|---------|--------|
| Intake form template present | PASS |
| Data source form present | PASS |
| Intake log present | PASS |
| Review criteria defined | PASS |

## Source Quality Assessment
| Source | Tier | Status | Reliability | Hacks | Notes |
|--------|------|--------|------------|-------|-------|
| Binance OHLCV REST API | Tier 1 (TRUE_DATA) | ACTIVE | HIGH | 17 | Primary data source; exchange-native; verifiable |
| Binance Funding Rate API | Tier 3 (EXTERNAL) | NOT_ACQUIRED | HIGH (when acquired) | 1 | Blocks H_FUNDING_TIMING; requires futures API key |
| Binance Open Interest API | Tier 3 (EXTERNAL) | NOT_ACQUIRED | HIGH (when acquired) | 1 | Blocks H_OPEN_INTEREST_SURGE |
| Binance Liquidations API | Tier 3 (EXTERNAL) | NOT_ACQUIRED | MEDIUM | 1 | Blocks H_LIQUIDATION_CASCADE; 7-day rolling limit |
| Alternative.me Fear & Greed | Tier 3 (EXTERNAL) | NOT_ACQUIRED | MEDIUM (no formal SLA) | 1 | Blocks H_SENTIMENT_EXTREME; backup source needed |
| OBV (proxy for directional flow) | Tier 2 (PROXY_DATA) | ACTIVE (proxy) | MEDIUM | 1 | H_OBV_DIVERGENCE; proxy correlation ~0.60 estimated |
| Low-volume bars as liquidity voids | Tier 2 (PROXY_DATA) | ACTIVE (proxy) | LOW-MEDIUM | 1 | H_LIQUIDITY_VOID_PROXY; proxy correlation ~0.45 estimated |

## Source Summary
| Category | Count |
|---------|-------|
| Tier 1 (TRUE_DATA) | 1 active |
| Tier 2 (PROXY_DATA) | 2 active proxies |
| Tier 3 (EXTERNAL) | 4 (all NOT_ACQUIRED) |
| Hacks blocked by missing data | 4 |
| Hacks unblocked | 16 |

## Risk Assessment
- OHLCV data: No risk. Binance REST API is stable and well-documented.
- Proxy data: Moderate risk. OBV and low-volume proxies are approximations.
- External data: 4 hacks blocked. Acquisition plan required for ELIGIBLE status.

## Recommendations
1. Acquire Binance futures API key to unblock H_FUNDING_TIMING and H_OPEN_INTEREST_SURGE.
2. Evaluate Coinglass as a backup liquidation data source.
3. Validate OBV proxy correlation using Binance taker buy/sell volume fields.
4. Set up Alternative.me data pipeline with backup (CNN Fear & Greed).
