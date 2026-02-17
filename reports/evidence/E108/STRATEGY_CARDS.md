# E108 STRATEGY CARDS

- fixture: data/fixtures/e108/e108_ohlcv_200bar.json (200 bars)
- strategies_evaluated: 2

### breakout_atr v1.0.0
- description: ATR-filtered breakout: buy on N-bar high break, sell on trailing ATR stop
- params: {"lookback":10,"atr_period":14,"atr_mult":1.5}
- bars: 200
- signals: BUY=2 SELL=2 HOLD=196
- assumptions: Works in trending markets with clear breakouts and sufficient volatility
- failure_modes: Choppy/ranging markets cause whipsaws; large gaps can bypass stops

### mean_revert_rsi v1.0.0
- description: RSI mean reversion: buy on oversold (<30), sell on overbought (>70)
- params: {"rsi_period":14,"oversold":30,"overbought":70}
- bars: 200
- signals: BUY=3 SELL=2 HOLD=195
- assumptions: Works in mean-reverting / ranging markets; price oscillates around fair value
- failure_modes: Strong trends cause continuous losses; buying dips in downtrend = catching knives

## Determinism Proof
- cards_hash: 6c259e0417f9556453d2a71ac415354c7b2b3d604341a4dc4d4876afab3b5cae
