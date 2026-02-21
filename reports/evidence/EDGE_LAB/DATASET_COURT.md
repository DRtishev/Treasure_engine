# DATASET_COURT.md — Dataset Contract Compliance Report
generated_at: 3444ae7de207
script: edge_dataset.mjs

## STATUS: PASS

## File Validation
| File | Exists |
|------|--------|
| EDGE_LAB/DATASET_CONTRACT.md | YES |
| EDGE_LAB/HACK_REGISTRY.md | YES |

## Contract Inventory
| Metric | Value |
|--------|-------|
| Data contracts found | 5 |
| Proxy contracts found | 2 |
| Contracts: DC_OHLCV_BINANCE_SPOT, DC_FUNDING_RATE_BINANCE, DC_OPEN_INTEREST_BINANCE, DC_LIQUIDATIONS_BINANCE, DC_FEAR_GREED_ALTERNATIVE | — |
| Proxies: PX_LIQUIDITY_VOID, PX_OBV_DIRECTIONAL_FLOW | — |

## Contract Section Checks
| Section | Status |
|---------|--------|
| OHLCV contract documented | PASS |
| Funding rate contract documented | PASS |
| Open interest contract documented | PASS |
| Liquidations contract documented | PASS |
| Fear & Greed contract documented | PASS |
| Proxy contracts documented | PASS |
| Data schema defined | PASS |
| Quality checks defined | PASS |
| Retention policy defined | PASS |

## Hack-to-Contract Coverage
| hack_id | dep_class | truth_tag | status | contract | contract_status |
|---------|-----------|-----------|--------|----------|----------------|
| H_ATR_SQUEEZE_BREAKOUT | OHLCV | TRUE_DATA | TESTING | DC_OHLCV_BINANCE_SPOT | COVERED |
| H_BB_SQUEEZE | OHLCV | TRUE_DATA | TESTING | DC_OHLCV_BINANCE_SPOT | COVERED |
| H_VWAP_REVERSAL | OHLCV | TRUE_DATA | TESTING | DC_OHLCV_BINANCE_SPOT | COVERED |
| H_VOLUME_SPIKE | OHLCV | TRUE_DATA | TESTING | DC_OHLCV_BINANCE_SPOT | COVERED |
| H_VOLUME_CLIMAX | OHLCV | TRUE_DATA | DRAFT | DC_OHLCV_BINANCE_SPOT | COVERED |
| H_MM_TRAP_FALSE_BREAK | OHLCV | TRUE_DATA | DRAFT | DC_OHLCV_BINANCE_SPOT | COVERED |
| H_LIQUIDITY_VOID_PROXY | OHLCV | PROXY_DATA | DRAFT | DC_OHLCV_BINANCE_SPOT | PROXY_DOCUMENTED |
| H_OBV_DIVERGENCE | OHLCV | PROXY_DATA | DRAFT | DC_OHLCV_BINANCE_SPOT | PROXY_DOCUMENTED |
| H_EQUITY_CURVE_THROTTLE | OHLCV | TRUE_DATA | DRAFT | DC_OHLCV_BINANCE_SPOT | COVERED |
| H_FUNDING_TIMING | EXTERNAL | UNAVAILABLE | NEEDS_DATA | DC_FUNDING_RATE_BINANCE | CONTRACT_EXISTS_NOT_ACQUIRED |
| H_RSI_DIVERGENCE | OHLCV | TRUE_DATA | DRAFT | DC_OHLCV_BINANCE_SPOT | COVERED |
| H_MACD_CROSS | OHLCV | TRUE_DATA | DRAFT | DC_OHLCV_BINANCE_SPOT | COVERED |
| H_RANGE_COMPRESSION | OHLCV | TRUE_DATA | DRAFT | DC_OHLCV_BINANCE_SPOT | COVERED |
| H_TREND_CONTINUATION | OHLCV | TRUE_DATA | DRAFT | DC_OHLCV_BINANCE_SPOT | COVERED |
| H_MEAN_REVERSION | OHLCV | TRUE_DATA | DRAFT | DC_OHLCV_BINANCE_SPOT | COVERED |
| H_GAP_FILL | OHLCV | TRUE_DATA | DRAFT | DC_OHLCV_BINANCE_SPOT | COVERED |
| H_BREAKOUT_RETEST | OHLCV | TRUE_DATA | DRAFT | DC_OHLCV_BINANCE_SPOT | COVERED |
| H_OPEN_INTEREST_SURGE | EXTERNAL | UNAVAILABLE | NEEDS_DATA | DC_OPEN_INTEREST_BINANCE | CONTRACT_EXISTS_NOT_ACQUIRED |
| H_LIQUIDATION_CASCADE | EXTERNAL | UNAVAILABLE | NEEDS_DATA | DC_LIQUIDATIONS_BINANCE | CONTRACT_EXISTS_NOT_ACQUIRED |
| H_SENTIMENT_EXTREME | EXTERNAL | UNAVAILABLE | NEEDS_DATA | DC_FEAR_GREED_ALTERNATIVE | CONTRACT_EXISTS_NOT_ACQUIRED |

## Coverage Summary
| Category | Count |
|---------|-------|
| Hacks with full contract coverage | 14 |
| Hacks with contract (data not yet acquired) | 4 |
| Hacks with proxy documented | 2 |
| Hacks with contract gaps | 0 |

## NEEDS_DATA Analysis
The following hacks are NEEDS_DATA due to external data acquisition:
- H_FUNDING_TIMING: DC_FUNDING_RATE_BINANCE — acquire Binance futures API key
- H_OPEN_INTEREST_SURGE: DC_OPEN_INTEREST_BINANCE — acquire futures data access
- H_LIQUIDATION_CASCADE: DC_LIQUIDATIONS_BINANCE — evaluate Coinglass as backup
- H_SENTIMENT_EXTREME: DC_FEAR_GREED_ALTERNATIVE — set up Alternative.me pipeline

These are documented NEEDS_DATA hacks. Their status is correct and expected.
DATASET_COURT evaluates contract documentation quality, not data acquisition status.

## Verdict
All data contracts are documented. 4 external contracts pending acquisition (expected for NEEDS_DATA hacks). Dataset court PASSED.
