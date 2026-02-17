# E108 PAPER-LIVE REPLAY 24H

## Parameters
- strategy: breakout_atr
- params: {"lookback":10,"atr_period":14,"atr_mult":1.5}
- bars: 200
- initial_capital: 10000 USDT

## Results
- fills: 4
- realized_pnl: 1.6272
- return_pct: 0.0162%
- max_drawdown: 0.0145%
- risk_events: 0

## Determinism Proof
- run1_hash: 629f589c1488f768d870f427a46b7333fa71642ec05d4836eb8d3b0bfb7b5e6e
- run2_hash: 629f589c1488f768d870f427a46b7333fa71642ec05d4836eb8d3b0bfb7b5e6e
- match: PASS

## Daily Report
```markdown
# E107 Daily Report: 2026-01-01
- run_id: E108-REPLAY-24H
- generated: 2026-01-01T23:59:59Z

## PnL Summary
| Metric | Value |
| --- | --- |
| Initial Capital | 10000.00 USDT |
| Equity | 10001.62 USDT |
| Realized PnL | 1.6272 USDT |
| Unrealized PnL | -0.0121 USDT |
| Total PnL | 1.6151 USDT |
| Return % | 0.0162% |
| Total Fees | 0.8000 USDT |
| Total Slippage | 0.4000 USDT |
| Max Drawdown | 0.0145% |
| Total Fills | 4 |

## Trades
| trade_id | ts | symbol | side | qty | price | exec_price | fee | slippage | realized_pnl |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PR000001 | 2024-01-01T01:20:00.000Z | BTCUSDT | BUY | 0.011819 | 42304.20 | 42312.66 | 0.2000 | 0.1000 | 0.0000 |
| PR000002 | 2024-01-01T09:15:00.000Z | BTCUSDT | SELL | 0.011737 | 42600.23 | 42591.71 | 0.2000 | 0.1000 | 3.0752 |
| PR000003 | 2024-01-01T13:45:00.000Z | BTCUSDT | BUY | 0.011771 | 42476.43 | 42484.93 | 0.2000 | 0.1000 | 0.0000 |
| PR000004 | 2024-01-01T15:40:00.000Z | BTCUSDT | SELL | 0.011796 | 42386.41 | 42377.93 | 0.2000 | 0.1000 | -1.4480 |

## Drawdown
- max_drawdown: 0.0145%
- high_watermark: 10003.08 USDT

## Anomalies
No anomalies detected.

## Status
- verdict: CLEAN
- fills: 4
- pnl: 1.6151
```
