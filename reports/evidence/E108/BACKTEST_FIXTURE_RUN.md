# E108 BACKTEST FIXTURE RUN

- fixture: data/fixtures/e108/e108_ohlcv_200bar.json (200 bars)
- strategies: 2

## breakout_atr
- params: {"lookback":10,"atr_period":14,"atr_mult":1.5}
- bars: 200
- fills: 4 (BUY=2 SELL=2)
- equity: 10001.62
- realized_pnl: 1.6272
- unrealized_pnl: -0.0121
- total_pnl: 1.6151
- return_pct: 0.0162%
- total_fees: 0.8000
- total_slippage: 0.4000
- max_drawdown: 0.0145%
- anomalies: 0

## mean_revert_rsi
- params: {"rsi_period":14,"oversold":30,"overbought":70}
- bars: 200
- fills: 5 (BUY=3 SELL=2)
- equity: 9999.86
- realized_pnl: 1.3173
- unrealized_pnl: -1.4539
- total_pnl: -0.1366
- return_pct: -0.0014%
- total_fees: 1.0000
- total_slippage: 0.5000
- max_drawdown: 0.0044%
- anomalies: 0

## Determinism Proof
- breakout_atr_ledger_hash: bd99a39c42d1f1e693069e2f11284c531e21cf389271772f016e5a22115fa28f
- mean_revert_rsi_ledger_hash: a4d27a1ead9cb331575c025cbc4a9a4c6b8969733a91079bf844544e57f2d39e
