# EXECUTION_MODEL.md — Execution Model Specification
version: 1.0.0 | last_updated: 2026-02-19

## Purpose

This document specifies the execution model used in all EDGE_LAB backtests. Every parameter defined here must be applied in simulation. Optimistic assumptions are explicitly prohibited.

---

## 1. Fee Model

### 1.1 Maker/Taker Fees

| Exchange | Role | Fee Rate | Notes |
|---------|------|---------|-------|
| Binance Spot | Taker | 0.10% | Default; 0.075% with BNB discount |
| Binance Spot | Maker | 0.10% | Default; 0.075% with BNB discount |
| Binance Futures | Taker | 0.05% | Default perpetual taker |
| Binance Futures | Maker | 0.02% | Default perpetual maker |

**Backtest default:** 0.10% taker fee (both sides: entry + exit)
**Total round-trip fee:** 0.20% (conservative, assumes taker both ways)

```
fee_rate_entry = 0.001   # 0.10%
fee_rate_exit  = 0.001   # 0.10%
total_fee      = fee_rate_entry + fee_rate_exit  # 0.20% round-trip
```

### 1.2 Funding Costs (Perpetuals)
For hacks using perpetual instruments, funding cost is modeled:
```
funding_per_8h = 0.01%  # average long-side cost estimate
daily_funding  = funding_per_8h * 3  # 3 settlements per day
```
Applied only for multi-day holding positions.

---

## 2. Slippage Model

### 2.1 Base Slippage

| Instrument | Liquidity Class | Default Slippage | Max Slippage |
|-----------|----------------|-----------------|-------------|
| BTCUSDT | Ultra-liquid | 0.02% | 0.10% |
| ETHUSDT | Highly liquid | 0.03% | 0.15% |
| SOLUSDT | Liquid | 0.05% | 0.25% |
| BNBUSDT | Liquid | 0.05% | 0.25% |
| Other | Medium | 0.10% | 0.50% |

**Backtest default:** 0.05% slippage (applied on both entry and exit)

### 2.2 Volume-Adjusted Slippage

Slippage scales with position size relative to bar volume:

```
position_size_pct_of_volume = position_value / (bar_volume * close_price)
if position_size_pct_of_volume > 0.01:  # > 1% of bar volume
    slippage_mult = 1 + (position_size_pct_of_volume - 0.01) * 10
    effective_slippage = base_slippage * slippage_mult
else:
    effective_slippage = base_slippage
```

### 2.3 Volatility Slippage
During high-volatility periods (ATR > 2x 20-period average):
```
vol_slippage_mult = 1.5
effective_slippage = base_slippage * vol_slippage_mult
```

---

## 3. Partial Fill Model

### 3.1 Policy

All market orders are assumed fully filled at the simulated price (conservative: assumes taker fill).
Limit orders have a fill probability model:

```
fill_probability:
  at_mid:        0.50  # 50% fill if order is at mid-price
  1_tick_inside: 0.75  # 75% fill if 1 tick inside spread
  2_ticks_inside: 0.95 # 95% fill if 2 ticks inside
  market_order:  1.00  # Always filled (at slippage cost)
```

### 3.2 Large Order Splitting
For positions > 2% of daily volume, split across 4 bars:
```
max_fill_per_bar = 0.5% of daily average volume
bars_to_fill = ceil(position_value / max_fill_per_bar)
```

---

## 4. Latency Model

### 4.1 Signal-to-Order Latency
Time from signal generation to order placement:

| Environment | Latency | Notes |
|-------------|---------|-------|
| Co-located server | 5ms | Best case |
| Cloud VPS (same region) | 50ms | Typical production |
| Cloud VPS (different region) | 200ms | Acceptable |
| Home internet | 500ms | Development only |

**Backtest assumption:** 100ms signal-to-order latency (conservative)
**Effect:** Entry price uses next bar open + slippage (bar-close signal with next-bar execution)

### 4.2 Order-to-Fill Latency
Time from order placement to confirmed fill:
```
market_order_latency_ms = 200   # Conservative estimate
limit_order_latency_ms  = 1000  # Up to 1 second
```

### 4.3 Bar-Close to Execution
Backtests execute on **next bar open** after a bar-close signal. This avoids look-ahead bias.

```
signal_bar = bar_close_time
execution_bar = bar_close_time + bar_duration  # next bar open
execution_price = next_bar_open * (1 + slippage)  # for long
```

---

## 5. Position Sizing Model

### 5.1 Default Risk Per Trade
```
risk_per_trade_pct = 0.01  # 1% of account equity
min_risk_pct       = 0.005 # 0.5% minimum
max_risk_pct       = 0.02  # 2% maximum per trade
```

### 5.2 Position Size Calculation
```
risk_amount = account_equity * risk_per_trade_pct
stop_distance = entry_price - stop_price  # absolute
position_size = risk_amount / stop_distance
position_value = position_size * entry_price
max_position_pct = 0.10  # Never risk more than 10% of equity in single position
position_value = min(position_value, account_equity * max_position_pct)
```

### 5.3 Concurrent Position Limits
```
max_concurrent_positions = 5
max_correlated_positions = 2  # Same instrument family (e.g., BTC and ETH)
```

---

## 6. Market Impact Model

### 6.1 Price Impact
For large orders, price impact is modeled using a square-root model:
```
price_impact_pct = 0.1 * sqrt(position_value_usd / daily_volume_usd)
```

### 6.2 Minimum Trade Size
```
min_trade_value_usd = 10.00  # Minimum trade size
min_lot_size_btc    = 0.001  # Binance minimum
```

---

## 7. Execution Parameters Summary

| Parameter | Conservative Value | Description |
|-----------|-------------------|-------------|
| fee_rate | 0.001 (0.10%) | Per-side taker fee |
| slippage_pct | 0.0005 (0.05%) | Per-side slippage |
| latency_ms | 100 | Signal-to-order delay |
| execution_bar | next_bar_open | Bar-close signal → next bar |
| risk_per_trade | 0.01 (1%) | Equity risked per trade |
| max_concurrent | 5 | Maximum open positions |
| round_trip_cost | 0.003 (0.30%) | Total cost (2x fee + 2x slip) |

---

## 8. Execution Sensitivity Grid Reference

See EXECUTION_SENSITIVITY_SPEC.md for the full parameter grid used to test edge robustness across execution cost assumptions. Any strategy that fails at 2x the baseline costs is flagged as execution-sensitive and requires further investigation.
