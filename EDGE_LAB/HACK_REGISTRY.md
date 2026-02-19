# HACK_REGISTRY.md — Edge Hypothesis Registry
version: 1.0.0 | last_updated: 2026-02-19 | total_hacks: 20

---

## H_ATR_SQUEEZE_BREAKOUT
| Field | Value |
|-------|-------|
| hack_id | H_ATR_SQUEEZE_BREAKOUT |
| name | ATR Squeeze Breakout |
| status | TESTING |
| dependency_class | OHLCV |
| truth_tag | TRUE_DATA |
| hypothesis | When ATR contracts below its 20-period average for 5+ bars and then expands >1.5x, price breaks out directionally with edge in the direction of the expansion. |
| entry_logic | ATR(14) < ATR_MA(20) for 5 consecutive bars, then ATR(14) > ATR_MA(20)*1.5; enter long if close > prior high, short if close < prior low |
| exit_logic | ATR-based trailing stop: 2x ATR(14) from entry; or 3R target |
| timeframes | [1h, 4h] |
| instruments | [BTCUSDT, ETHUSDT] |
| params | {"atr_period": 14, "squeeze_bars": 5, "expansion_mult": 1.5, "stop_atr_mult": 2.0, "target_r": 3.0} |
| created_at | 2026-01-15 |
| updated_at | 2026-02-19 |
| trials_count | 47 |
| oos_periods | ["2024-01 to 2024-06", "2024-07 to 2024-12"] |

---

## H_BB_SQUEEZE
| Field | Value |
|-------|-------|
| hack_id | H_BB_SQUEEZE |
| name | Bollinger Band Squeeze Momentum |
| status | TESTING |
| dependency_class | OHLCV |
| truth_tag | TRUE_DATA |
| hypothesis | When Bollinger Band width reaches a 6-month low (squeeze state), the subsequent momentum expansion yields directional edge for 2-5 bars. |
| entry_logic | BB width < BB width percentile(10) over last 126 bars; enter in direction of first close beyond band after squeeze |
| exit_logic | Close back within bands OR 4R target OR 1.5x BB width from entry |
| timeframes | [4h, 1d] |
| instruments | [BTCUSDT, ETHUSDT, SOLUSDT] |
| params | {"bb_period": 20, "bb_std": 2.0, "squeeze_percentile": 10, "lookback_bars": 126, "target_r": 4.0} |
| created_at | 2026-01-15 |
| updated_at | 2026-02-19 |
| trials_count | 38 |
| oos_periods | ["2024-01 to 2024-06", "2024-07 to 2024-12"] |

---

## H_VWAP_REVERSAL
| Field | Value |
|-------|-------|
| hack_id | H_VWAP_REVERSAL |
| name | VWAP Mean Reversion |
| status | TESTING |
| dependency_class | OHLCV |
| truth_tag | TRUE_DATA |
| hypothesis | Price deviations beyond 2 standard deviations from daily VWAP revert to VWAP with edge when volume confirms exhaustion. |
| entry_logic | Price > VWAP + 2*VWAP_STD and volume on deviation bar < prior 5-bar avg volume; enter short (reverse for long) |
| exit_logic | Price returns to VWAP ± 0.25*VWAP_STD OR 1.5R stop |
| timeframes | [15m, 1h] |
| instruments | [BTCUSDT, ETHUSDT] |
| params | {"vwap_std_bands": 2.0, "volume_ratio_threshold": 0.8, "target_vwap_band": 0.25, "stop_r": 1.5} |
| created_at | 2026-01-20 |
| updated_at | 2026-02-19 |
| trials_count | 52 |
| oos_periods | ["2024-Q3", "2024-Q4"] |

---

## H_VOLUME_SPIKE
| Field | Value |
|-------|-------|
| hack_id | H_VOLUME_SPIKE |
| name | Volume Spike Continuation |
| status | TESTING |
| dependency_class | OHLCV |
| truth_tag | TRUE_DATA |
| hypothesis | A volume spike >= 3x the 20-bar average accompanied by a close in the upper/lower 25% of the bar range signals directional continuation for 3-8 bars. |
| entry_logic | Volume > 3*Volume_MA(20) AND close in top 25% of bar range (long) or bottom 25% (short); enter next bar open |
| exit_logic | 2R trailing stop or 5R target |
| timeframes | [1h, 4h] |
| instruments | [BTCUSDT, ETHUSDT, BNBUSDT] |
| params | {"volume_mult": 3.0, "volume_ma_period": 20, "range_threshold": 0.25, "stop_r": 2.0, "target_r": 5.0} |
| created_at | 2026-01-22 |
| updated_at | 2026-02-19 |
| trials_count | 41 |
| oos_periods | ["2024-H1", "2024-H2"] |

---

## H_VOLUME_CLIMAX
| Field | Value |
|-------|-------|
| hack_id | H_VOLUME_CLIMAX |
| name | Volume Climax Reversal |
| status | DRAFT |
| dependency_class | OHLCV |
| truth_tag | TRUE_DATA |
| hypothesis | Exhaustion volume climax (>5x average) with a reversal candle pattern marks short-term tops/bottoms with mean-reversion edge. |
| entry_logic | Volume > 5*Volume_MA(20) AND (bearish engulfing OR shooting star for short; bullish engulfing OR hammer for long) on climax bar |
| exit_logic | 1.5R stop from entry candle high/low; target prior swing level |
| timeframes | [1h, 4h, 1d] |
| instruments | [BTCUSDT, ETHUSDT] |
| params | {"volume_climax_mult": 5.0, "volume_ma_period": 20, "stop_r": 1.5, "candle_patterns": ["engulfing", "hammer", "shooting_star"]} |
| created_at | 2026-01-25 |
| updated_at | 2026-02-19 |
| trials_count | 0 |
| oos_periods | [] |

---

## H_MM_TRAP_FALSE_BREAK
| Field | Value |
|-------|-------|
| hack_id | H_MM_TRAP_FALSE_BREAK |
| name | Market Maker Trap / False Breakout |
| status | DRAFT |
| dependency_class | OHLCV |
| truth_tag | TRUE_DATA |
| hypothesis | Price spikes beyond a consolidation range high/low by > ATR(14)*0.5 then closes back inside the range within 2 bars, signaling a trapped-traders reversal. |
| entry_logic | Price closes beyond range boundary by > 0.5*ATR(14), then closes back inside range boundary within 2 bars; enter in reversal direction |
| exit_logic | Target opposite range boundary; stop beyond trap wick high/low + 0.1*ATR(14) |
| timeframes | [1h, 4h] |
| instruments | [BTCUSDT, ETHUSDT, SOLUSDT] |
| params | {"consolidation_bars": 20, "spike_atr_mult": 0.5, "reversal_bars": 2, "stop_buffer_atr_mult": 0.1} |
| created_at | 2026-01-28 |
| updated_at | 2026-02-19 |
| trials_count | 0 |
| oos_periods | [] |

---

## H_LIQUIDITY_VOID_PROXY
| Field | Value |
|-------|-------|
| hack_id | H_LIQUIDITY_VOID_PROXY |
| name | Liquidity Void Fill (Proxy) |
| status | DRAFT |
| dependency_class | OHLCV |
| truth_tag | PROXY_DATA |
| hypothesis | Price gaps or rapid sweeps creating low-volume zones (liquidity voids) are subsequently filled when price returns to the zone, providing a fade entry. |
| entry_logic | Identify bars with < 10% of average volume (proxy for order book void); when price enters void zone, enter fade position |
| exit_logic | Target: 75% fill of void zone; stop: 1.5R beyond void entry |
| timeframes | [1h, 4h] |
| instruments | [BTCUSDT, ETHUSDT] |
| params | {"void_volume_pct": 0.10, "volume_ma_period": 20, "fill_target_pct": 0.75, "stop_r": 1.5} |
| proxy_definition | True liquidity voids require Level 2 order book data to identify actual gaps. Proxy uses bars with volume < 10% of 20-period MA as approximation. |
| proxy_failure_modes | 1. Low-volume bars may not correspond to actual order book voids; 2. Thin liquidity periods misidentified as structural voids; 3. Time-of-day volume patterns contaminate signal |
| created_at | 2026-02-01 |
| updated_at | 2026-02-19 |
| trials_count | 0 |
| oos_periods | [] |

---

## H_OBV_DIVERGENCE
| Field | Value |
|-------|-------|
| hack_id | H_OBV_DIVERGENCE |
| name | OBV Divergence Signal (Proxy) |
| status | DRAFT |
| dependency_class | OHLCV |
| truth_tag | PROXY_DATA |
| hypothesis | When OBV makes a higher high while price makes a lower high (bullish divergence) or OBV lower low while price higher low (bearish), a reversal with edge occurs within 10 bars. |
| entry_logic | OBV divergence confirmed over 10-bar lookback; price must be in opposite trend to OBV for 5+ bars; enter on divergence bar close |
| exit_logic | 2R stop from entry; target 1.5x divergence amplitude |
| timeframes | [4h, 1d] |
| instruments | [BTCUSDT, ETHUSDT, SOLUSDT] |
| params | {"divergence_lookback": 10, "price_trend_bars": 5, "stop_r": 2.0, "target_mult": 1.5} |
| proxy_definition | OBV is a proxy for actual trade flow (buy vs sell volume). True directional volume requires exchange-native aggressor-side trade data. OBV constructed from close-direction volume. |
| proxy_failure_modes | 1. OBV direction is ambiguous on doji bars; 2. Does not distinguish between large institutional orders and many small retail orders; 3. Exchange-specific volume differences not captured |
| created_at | 2026-02-03 |
| updated_at | 2026-02-19 |
| trials_count | 0 |
| oos_periods | [] |

---

## H_EQUITY_CURVE_THROTTLE
| Field | Value |
|-------|-------|
| hack_id | H_EQUITY_CURVE_THROTTLE |
| name | Equity Curve Regime Throttle |
| status | DRAFT |
| dependency_class | OHLCV |
| truth_tag | TRUE_DATA |
| hypothesis | Applying a moving-average filter to the equity curve of any sub-strategy and halting trading when equity is below its MA reduces drawdown without proportionally reducing returns. |
| entry_logic | Take all signals from base strategy only when equity curve is above its 20-period MA; pause when below |
| exit_logic | Resume trading when equity curve re-crosses above its 20-period MA |
| timeframes | [1h, 4h] |
| instruments | [BTCUSDT, ETHUSDT] |
| params | {"equity_ma_period": 20, "throttle_mode": "pause", "resume_bars_above": 1} |
| created_at | 2026-02-05 |
| updated_at | 2026-02-19 |
| trials_count | 0 |
| oos_periods | [] |

---

## H_FUNDING_TIMING
| Field | Value |
|-------|-------|
| hack_id | H_FUNDING_TIMING |
| name | Funding Rate Timing |
| status | NEEDS_DATA |
| dependency_class | EXTERNAL |
| truth_tag | UNAVAILABLE |
| hypothesis | Extreme positive funding rates (>0.1% per 8h) predict short-term mean reversion as over-leveraged longs are squeezed; entry before funding payment yields edge. |
| entry_logic | Funding rate > 0.1% (short signal) or < -0.05% (long signal) at T-30min before funding settlement; enter and hold through funding |
| exit_logic | Exit at T+2h post funding, or 2R stop, whichever first |
| timeframes | [1h] |
| instruments | [BTCUSDT, ETHUSDT] |
| params | {"long_threshold": -0.0005, "short_threshold": 0.001, "entry_lead_min": 30, "hold_hours": 2, "stop_r": 2.0} |
| next_action | Acquire perpetual funding rate feed from Binance futures API; integrate into DATASET_CONTRACT.md as EXTERNAL source |
| created_at | 2026-02-08 |
| updated_at | 2026-02-19 |
| trials_count | 0 |
| oos_periods | [] |

---

## H_RSI_DIVERGENCE
| Field | Value |
|-------|-------|
| hack_id | H_RSI_DIVERGENCE |
| name | RSI Classic Divergence |
| status | DRAFT |
| dependency_class | OHLCV |
| truth_tag | TRUE_DATA |
| hypothesis | Classic RSI divergence (price higher high, RSI lower high for bearish; price lower low, RSI higher low for bullish) predicts mean reversion within 15 bars. |
| entry_logic | RSI(14) divergence confirmed over 15-bar lookback; divergence must span at least 5 bars; enter on divergence confirmation bar |
| exit_logic | 1.5R stop; target 50% retracement of divergence move |
| timeframes | [4h, 1d] |
| instruments | [BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT] |
| params | {"rsi_period": 14, "divergence_lookback": 15, "min_divergence_bars": 5, "stop_r": 1.5} |
| created_at | 2026-02-10 |
| updated_at | 2026-02-19 |
| trials_count | 0 |
| oos_periods | [] |

---

## H_MACD_CROSS
| Field | Value |
|-------|-------|
| hack_id | H_MACD_CROSS |
| name | MACD Signal Line Cross with Volume Confirmation |
| status | DRAFT |
| dependency_class | OHLCV |
| truth_tag | TRUE_DATA |
| hypothesis | MACD line crossing signal line with above-average volume generates reliable directional momentum edge, particularly after extended trend exhaustion periods. |
| entry_logic | MACD(12,26,9) line crosses signal line; volume on cross bar > 1.3x 20-bar MA volume; RSI(14) not overbought/oversold (30-70 zone) |
| exit_logic | Opposing MACD cross OR 3R trailing stop |
| timeframes | [4h, 1d] |
| instruments | [BTCUSDT, ETHUSDT] |
| params | {"macd_fast": 12, "macd_slow": 26, "macd_signal": 9, "volume_mult": 1.3, "volume_ma": 20, "rsi_neutral_min": 30, "rsi_neutral_max": 70} |
| created_at | 2026-02-10 |
| updated_at | 2026-02-19 |
| trials_count | 0 |
| oos_periods | [] |

---

## H_RANGE_COMPRESSION
| Field | Value |
|-------|-------|
| hack_id | H_RANGE_COMPRESSION |
| name | Daily Range Compression Breakout |
| status | DRAFT |
| dependency_class | OHLCV |
| truth_tag | TRUE_DATA |
| hypothesis | When the daily high-low range compresses to < 50% of its 20-day average for 3+ consecutive days, the subsequent range expansion yields a breakout trade with edge. |
| entry_logic | Daily range < 0.5 * Range_MA(20) for 3+ consecutive days; enter breakout when price exceeds prior day high (long) or low (short) by > 0.2*ATR(14) |
| exit_logic | 2R ATR stop; target 1.5x compressed range expansion |
| timeframes | [1d] |
| instruments | [BTCUSDT, ETHUSDT, SOLUSDT] |
| params | {"range_compress_ratio": 0.5, "compress_days": 3, "range_ma": 20, "breakout_buffer_atr": 0.2, "stop_r": 2.0} |
| created_at | 2026-02-11 |
| updated_at | 2026-02-19 |
| trials_count | 0 |
| oos_periods | [] |

---

## H_TREND_CONTINUATION
| Field | Value |
|-------|-------|
| hack_id | H_TREND_CONTINUATION |
| name | EMA Trend Continuation Pullback |
| status | DRAFT |
| dependency_class | OHLCV |
| truth_tag | TRUE_DATA |
| hypothesis | In a confirmed trend (price above/below 50 EMA for 10+ bars), first pullback to the 21 EMA provides continuation entry with edge. |
| entry_logic | Price above EMA(50) for 10+ bars (uptrend); first touch of EMA(21) after a bar closes above EMA(21) by >0.5*ATR(14); enter long. Reverse for downtrend. |
| exit_logic | Stop below EMA(50) - 0.5*ATR(14); target 2R |
| timeframes | [1h, 4h] |
| instruments | [BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT] |
| params | {"trend_ema": 50, "entry_ema": 21, "trend_bars": 10, "entry_buffer_atr": 0.5, "stop_ema_buffer_atr": 0.5, "target_r": 2.0} |
| created_at | 2026-02-11 |
| updated_at | 2026-02-19 |
| trials_count | 0 |
| oos_periods | [] |

---

## H_MEAN_REVERSION
| Field | Value |
|-------|-------|
| hack_id | H_MEAN_REVERSION |
| name | Z-Score Mean Reversion |
| status | DRAFT |
| dependency_class | OHLCV |
| truth_tag | TRUE_DATA |
| hypothesis | When price z-score relative to its 50-period mean exceeds ±2.5, mean reversion within 10 bars occurs with positive expectancy in ranging market conditions. |
| entry_logic | Z-score(close, 50) > 2.5 → short; Z-score < -2.5 → long; ADX(14) < 25 (confirming range, not trend) |
| exit_logic | Z-score returns to 0 (mean) OR 2R stop |
| timeframes | [1h, 4h] |
| instruments | [BTCUSDT, ETHUSDT] |
| params | {"zscore_period": 50, "zscore_threshold": 2.5, "adx_period": 14, "adx_max": 25, "stop_r": 2.0} |
| created_at | 2026-02-12 |
| updated_at | 2026-02-19 |
| trials_count | 0 |
| oos_periods | [] |

---

## H_GAP_FILL
| Field | Value |
|-------|-------|
| hack_id | H_GAP_FILL |
| name | Gap Fill Reversion |
| status | DRAFT |
| dependency_class | OHLCV |
| truth_tag | TRUE_DATA |
| hypothesis | Price gaps > 1% at daily open tend to fill within the session with measurable edge on fade entries, particularly on moderate-volume gaps (1.5-3x average). |
| entry_logic | Daily open gap > 1% from prior close; gap-up → short at open; gap-down → long at open; volume on gap bar must be 1.5-3x 20-day average |
| exit_logic | Target prior close (gap fill); stop 0.5% beyond open gap |
| timeframes | [1d, 4h] |
| instruments | [BTCUSDT, ETHUSDT] |
| params | {"gap_min_pct": 0.01, "volume_min_mult": 1.5, "volume_max_mult": 3.0, "volume_ma": 20, "stop_pct": 0.005} |
| created_at | 2026-02-12 |
| updated_at | 2026-02-19 |
| trials_count | 0 |
| oos_periods | [] |

---

## H_BREAKOUT_RETEST
| Field | Value |
|-------|-------|
| hack_id | H_BREAKOUT_RETEST |
| name | Breakout-Retest Entry |
| status | DRAFT |
| dependency_class | OHLCV |
| truth_tag | TRUE_DATA |
| hypothesis | After a confirmed breakout above a key resistance level (10-bar high), price retests the breakout level within 5 bars and holds, providing a lower-risk continuation entry. |
| entry_logic | Price closes above 10-bar high with volume > 1.5x MA; within 5 bars price retests the breakout level (within 0.25*ATR(14)); enter long on retest candle close |
| exit_logic | Stop below retest candle low - 0.1*ATR(14); target 2x breakout range |
| timeframes | [1h, 4h] |
| instruments | [BTCUSDT, ETHUSDT, SOLUSDT] |
| params | {"breakout_period": 10, "volume_mult": 1.5, "volume_ma": 20, "retest_bars": 5, "retest_buffer_atr": 0.25, "stop_buffer_atr": 0.1, "target_range_mult": 2.0} |
| created_at | 2026-02-13 |
| updated_at | 2026-02-19 |
| trials_count | 0 |
| oos_periods | [] |

---

## H_OPEN_INTEREST_SURGE
| Field | Value |
|-------|-------|
| hack_id | H_OPEN_INTEREST_SURGE |
| name | Open Interest Surge Momentum |
| status | NEEDS_DATA |
| dependency_class | EXTERNAL |
| truth_tag | UNAVAILABLE |
| hypothesis | A sudden OI surge > 20% in 4 hours while price makes a new 24h high signals leveraged trend continuation. |
| entry_logic | OI increases > 20% in 4h AND price is at 24h high; enter long; reverse conditions for short |
| exit_logic | OI decreases > 10% (deleveraging) OR 3R stop |
| timeframes | [4h] |
| instruments | [BTCUSDT, ETHUSDT] |
| params | {"oi_surge_pct": 0.20, "oi_window_hours": 4, "oi_exit_pct": 0.10, "stop_r": 3.0} |
| next_action | Acquire perpetual open interest feed from Binance futures API /fapi/v1/openInterestHist |
| created_at | 2026-02-14 |
| updated_at | 2026-02-19 |
| trials_count | 0 |
| oos_periods | [] |

---

## H_LIQUIDATION_CASCADE
| Field | Value |
|-------|-------|
| hack_id | H_LIQUIDATION_CASCADE |
| name | Liquidation Cascade Bounce |
| status | NEEDS_DATA |
| dependency_class | EXTERNAL |
| truth_tag | UNAVAILABLE |
| hypothesis | Large liquidation events (>$50M in 1h) create temporary price dislocations that revert 60-80% within 4h, providing a counter-trend entry opportunity. |
| entry_logic | Liquidation volume > $50M in 1h (source: exchange liquidation feed); enter counter-trend 30min after liquidation peak |
| exit_logic | 60% revert of liquidation move OR 1.5R stop |
| timeframes | [1h] |
| instruments | [BTCUSDT, ETHUSDT] |
| params | {"liquidation_threshold_usd": 50000000, "liquidation_window_hours": 1, "entry_delay_min": 30, "revert_target_pct": 0.60, "stop_r": 1.5} |
| next_action | Acquire liquidation data feed; evaluate Coinglass API or Binance /fapi/v1/allForceOrders |
| created_at | 2026-02-14 |
| updated_at | 2026-02-19 |
| trials_count | 0 |
| oos_periods | [] |

---

## H_SENTIMENT_EXTREME
| Field | Value |
|-------|-------|
| hack_id | H_SENTIMENT_EXTREME |
| name | Sentiment Extreme Contrarian |
| status | NEEDS_DATA |
| dependency_class | EXTERNAL |
| truth_tag | UNAVAILABLE |
| hypothesis | Crypto Fear & Greed Index at extremes (<15 extreme fear or >85 extreme greed) combined with price at 30-day high/low predicts 48-72h mean reversion with edge. |
| entry_logic | Fear & Greed < 15 AND price at 30-day low → long; Fear & Greed > 85 AND price at 30-day high → short |
| exit_logic | Fear & Greed returns to 40-60 range OR 5% adverse move stop |
| timeframes | [1d] |
| instruments | [BTCUSDT] |
| params | {"fear_greed_low": 15, "fear_greed_high": 85, "price_lookback_days": 30, "stop_pct": 0.05} |
| next_action | Integrate Alternative.me Fear & Greed Index API; schedule daily data collection |
| created_at | 2026-02-14 |
| updated_at | 2026-02-19 |
| trials_count | 0 |
| oos_periods | [] |

---

## Registry Summary

| hack_id | dependency_class | truth_tag | status | trials_count |
|---------|-----------------|-----------|--------|-------------|
| H_ATR_SQUEEZE_BREAKOUT | OHLCV | TRUE_DATA | TESTING | 47 |
| H_BB_SQUEEZE | OHLCV | TRUE_DATA | TESTING | 38 |
| H_VWAP_REVERSAL | OHLCV | TRUE_DATA | TESTING | 52 |
| H_VOLUME_SPIKE | OHLCV | TRUE_DATA | TESTING | 41 |
| H_VOLUME_CLIMAX | OHLCV | TRUE_DATA | DRAFT | 0 |
| H_MM_TRAP_FALSE_BREAK | OHLCV | TRUE_DATA | DRAFT | 0 |
| H_LIQUIDITY_VOID_PROXY | OHLCV | PROXY_DATA | DRAFT | 0 |
| H_OBV_DIVERGENCE | OHLCV | PROXY_DATA | DRAFT | 0 |
| H_EQUITY_CURVE_THROTTLE | OHLCV | TRUE_DATA | DRAFT | 0 |
| H_FUNDING_TIMING | EXTERNAL | UNAVAILABLE | NEEDS_DATA | 0 |
| H_RSI_DIVERGENCE | OHLCV | TRUE_DATA | DRAFT | 0 |
| H_MACD_CROSS | OHLCV | TRUE_DATA | DRAFT | 0 |
| H_RANGE_COMPRESSION | OHLCV | TRUE_DATA | DRAFT | 0 |
| H_TREND_CONTINUATION | OHLCV | TRUE_DATA | DRAFT | 0 |
| H_MEAN_REVERSION | OHLCV | TRUE_DATA | DRAFT | 0 |
| H_GAP_FILL | OHLCV | TRUE_DATA | DRAFT | 0 |
| H_BREAKOUT_RETEST | OHLCV | TRUE_DATA | DRAFT | 0 |
| H_OPEN_INTEREST_SURGE | EXTERNAL | UNAVAILABLE | NEEDS_DATA | 0 |
| H_LIQUIDATION_CASCADE | EXTERNAL | UNAVAILABLE | NEEDS_DATA | 0 |
| H_SENTIMENT_EXTREME | EXTERNAL | UNAVAILABLE | NEEDS_DATA | 0 |

**Total: 20 hacks | OHLCV: 13 | EXTERNAL: 4 (but H_FUNDING_TIMING counts as EXTERNAL too = total EXTERNAL: 4) | PROXY: 2**
**TESTING: 4 | DRAFT: 12 | NEEDS_DATA: 4**
