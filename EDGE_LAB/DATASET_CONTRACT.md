# DATASET_CONTRACT.md — Data Contract Specification
version: 1.0.0 | last_updated: 2026-02-19

## Purpose

This document specifies the data contracts for all datasets used in EDGE_LAB hypothesis testing. A data contract defines the schema, SLA, and quality expectations for each data source. No dataset may be used in backtesting without a contract entry.

---

## Contract 1: OHLCV Spot — Binance REST API

| Field | Value |
|-------|-------|
| contract_id | DC_OHLCV_BINANCE_SPOT |
| source | Binance REST API /api/v3/klines |
| dependency_class | OHLCV |
| status | ACTIVE |
| instruments | BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT |
| timeframes | 1m, 5m, 15m, 30m, 1h, 4h, 1d |
| historical_from | 2017-08-17 (BTCUSDT inception) |
| update_frequency | On-demand pull; real-time via WebSocket |
| max_bars_per_request | 1000 |
| rate_limit | 1200 weight/min; klines = 2 weight per call |
| sla_uptime | 99.9% (Binance SLA) |
| acceptable_gap_bars | 3 consecutive missing bars |
| staleness_threshold_sec | 2x bar period in seconds |

### Schema

```
{
  "open_time": "unix_ms",
  "open": "decimal_string",
  "high": "decimal_string",
  "low": "decimal_string",
  "close": "decimal_string",
  "volume": "decimal_string",
  "close_time": "unix_ms",
  "quote_asset_volume": "decimal_string",
  "number_of_trades": "integer",
  "taker_buy_base_volume": "decimal_string",
  "taker_buy_quote_volume": "decimal_string"
}
```

### Quality Checks
- high >= open, high >= close, high >= low (always true or REJECT bar)
- low <= open, low <= close, low <= high (always true or REJECT bar)
- volume >= 0 (always true or REJECT bar)
- close_time = open_time + bar_duration - 1ms
- No duplicate open_time values within same instrument+timeframe

### Applicable Hacks
All OHLCV dependency_class hacks (17 hacks)

---

## Contract 2: Funding Rate — Binance Futures API

| Field | Value |
|-------|-------|
| contract_id | DC_FUNDING_RATE_BINANCE |
| source | Binance /fapi/v1/fundingRate |
| dependency_class | EXTERNAL |
| status | NOT_ACQUIRED |
| instruments | BTCUSDT, ETHUSDT |
| settlement_frequency | Every 8 hours (00:00, 08:00, 16:00 UTC) |
| historical_from | 2019-09-13 (Binance perp launch) |
| sla_uptime | 99.9% |
| acquisition_blocker | API key with futures access required |
| next_action | Acquire Binance futures API key; implement DC_FUNDING_RATE_BINANCE ingestion |

### Schema (planned)
```
{
  "symbol": "string",
  "fundingTime": "unix_ms",
  "fundingRate": "decimal_string",
  "markPrice": "decimal_string"
}
```

### Applicable Hacks
- H_FUNDING_TIMING

---

## Contract 3: Open Interest — Binance Futures API

| Field | Value |
|-------|-------|
| contract_id | DC_OPEN_INTEREST_BINANCE |
| source | Binance /fapi/v1/openInterestHist |
| dependency_class | EXTERNAL |
| status | NOT_ACQUIRED |
| instruments | BTCUSDT, ETHUSDT |
| timeframes | 5m, 15m, 30m, 1h, 2h, 4h, 6h, 12h, 1d |
| sla_uptime | 99.9% |
| acquisition_blocker | Futures API key and data retention policy review needed |

### Schema (planned)
```
{
  "symbol": "string",
  "sumOpenInterest": "decimal_string",
  "sumOpenInterestValue": "decimal_string",
  "timestamp": "unix_ms"
}
```

### Applicable Hacks
- H_OPEN_INTEREST_SURGE

---

## Contract 4: Liquidations — Binance Futures Force Orders

| Field | Value |
|-------|-------|
| contract_id | DC_LIQUIDATIONS_BINANCE |
| source | Binance /fapi/v1/allForceOrders |
| dependency_class | EXTERNAL |
| status | NOT_ACQUIRED |
| instruments | BTCUSDT, ETHUSDT |
| history_days | 7 days rolling (Binance limitation) |
| sla_uptime | 99.5% |
| acquisition_blocker | Historical depth limited; consider Coinglass for deeper history |

### Schema (planned)
```
{
  "symbol": "string",
  "side": "BUY|SELL",
  "type": "LIMIT",
  "price": "decimal_string",
  "origQty": "decimal_string",
  "executedQty": "decimal_string",
  "averagePrice": "decimal_string",
  "status": "FILLED",
  "time": "unix_ms"
}
```

### Applicable Hacks
- H_LIQUIDATION_CASCADE

---

## Contract 5: Fear & Greed Index — Alternative.me

| Field | Value |
|-------|-------|
| contract_id | DC_FEAR_GREED_ALTERNATIVE |
| source | Alternative.me API https://api.alternative.me/fng/ |
| dependency_class | EXTERNAL |
| status | NOT_ACQUIRED |
| instruments | BTC (market-wide sentiment) |
| update_frequency | Daily |
| historical_from | 2018-02-01 |
| sla_uptime | ~95% (no formal SLA from provider) |
| acquisition_blocker | No formal SLA; need backup source (CNN Money F&G or similar) |

### Schema (planned)
```
{
  "name": "Fear & Greed Index",
  "data": [
    {
      "value": "integer_0_to_100",
      "value_classification": "Extreme Fear|Fear|Neutral|Greed|Extreme Greed",
      "timestamp": "unix_sec",
      "time_until_update": "string"
    }
  ]
}
```

### Applicable Hacks
- H_SENTIMENT_EXTREME

---

## Proxy Data Contracts

### Proxy: Liquidity Void (H_LIQUIDITY_VOID_PROXY)

| Field | Value |
|-------|-------|
| proxy_id | PX_LIQUIDITY_VOID |
| underlying_contract | DC_OHLCV_BINANCE_SPOT |
| real_quantity | L2 order book gaps / thin liquidity zones |
| proxy_construction | Identify bars with volume < 10% of Volume_MA(20) |
| correlation_estimate | ~0.45 (estimated, not empirically validated) |
| validation_status | NOT_VALIDATED |
| next_action | Run correlation study when L2 data briefly available |

### Proxy: OBV Directional Flow (H_OBV_DIVERGENCE)

| Field | Value |
|-------|-------|
| proxy_id | PX_OBV_DIRECTIONAL_FLOW |
| underlying_contract | DC_OHLCV_BINANCE_SPOT |
| real_quantity | Aggressor-side net buy/sell volume |
| proxy_construction | OBV = cumsum of (volume * sign(close - prior_close)) |
| correlation_estimate | ~0.60 (estimated based on academic literature) |
| validation_status | NOT_VALIDATED |
| next_action | Validate using Binance taker buy/sell volume fields |

---

## Contract Lifecycle

```
NOT_ACQUIRED → TESTING → ACTIVE
NOT_ACQUIRED → REJECTED (source deemed unsuitable)
ACTIVE → DEPRECATED (source retired or replaced)
```

## Data Retention Policy

| Data Type | Retention Period | Storage Location |
|-----------|-----------------|-----------------|
| OHLCV 1m | 5 years | Local DB |
| OHLCV 5m-1d | Indefinite | Local DB |
| Funding rates | 5 years | Local DB (when acquired) |
| OI history | 5 years | Local DB (when acquired) |
| Liquidations | 1 year | Local DB (when acquired) |
| Sentiment | 5 years | Local DB (when acquired) |
| Raw API responses | 30 days | Rolling archive |
