# E109 STRATEGY SCOREBOARD

- bars: 200
- days: 0.69
- min_trades: 10
- min_days: 1
- min_oos_bars: 20

| Strategy | Verdict | PF | Sharpe | MaxDD% | WinRate% | Trades | Return% | OOS_avg | IS_avg |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| breakout_atr | INSUFFICIENT_DATA | 3.30 | 0.5774 | 0.01 | 50.0 | 4 | 0.0162 | 0.0010 | 0.0147 |
| mean_revert_rsi | INSUFFICIENT_DATA | 58.58 | 0.1876 | 0.00 | 50.0 | 5 | -0.0014 | 0.0009 | 0.0105 |

## breakout_atr
- verdict: INSUFFICIENT_DATA
- court: FAIL
- court_reasons: IS/OOS ratio too high: 15.32 > 3
- wfo_stability: 0.0017
- wfo_folds: 3
- best_config: {"atr_mult":1.5,"atr_period":5,"lookback":5}

## mean_revert_rsi
- verdict: INSUFFICIENT_DATA
- court: FAIL
- court_reasons: IS/OOS ratio too high: 11.17 > 3
- wfo_stability: 0.0050
- wfo_folds: 3
- best_config: {"overbought":60,"oversold":37,"rsi_period":6}

## Determinism
- scoreboard_hash: 0bd7ad035c82859246fafefad3abb1b37d6bd0c78ecb5dff0f5556685b9d16f4
