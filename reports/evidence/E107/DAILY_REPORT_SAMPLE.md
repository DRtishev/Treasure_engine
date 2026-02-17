# E107 DAILY REPORT SAMPLE

## Track 2: Daily Report

### Module
- path: scripts/report/e107_daily_report.mjs
- uses: foundation_render for stable formatting

### Sample Report
```markdown
# E107 Daily Report: 2026-01-01
- run_id: E107-SAMPLE-001
- generated: 2026-01-01T23:59:59Z

## PnL Summary
| Metric | Value |
| --- | --- |
| Initial Capital | 10000.00 USDT |
| Equity | 10046.30 USDT |
| Realized PnL | 46.3000 USDT |
| Unrealized PnL | 0.0000 USDT |
| Total PnL | 46.3000 USDT |
| Return % | 0.4630% |
| Total Fees | 3.3800 USDT |
| Total Slippage | 2.0000 USDT |
| Max Drawdown | 0.0000% |
| Total Fills | 2 |

## Trades
| trade_id | ts | symbol | side | qty | price | exec_price | fee | slippage | realized_pnl |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T000001 | 2026-01-01T00:00:00Z | BTCUSDT | BUY | 0.100000 | 42000.00 | 42010.00 | 1.6800 | 1.0000 | 0.0000 |
| T000002 | 2026-01-01T00:05:00Z | BTCUSDT | SELL | 0.100000 | 42500.00 | 42490.00 | 1.7000 | 1.0000 | 46.3000 |

## Drawdown
- max_drawdown: 0.0000%
- high_watermark: 10046.30 USDT

## Anomalies
No anomalies detected.

## Status
- verdict: CLEAN
- fills: 2
- pnl: 46.3000
```

### Determinism Proof
- report_hash: d768b872b6924bc73efddcec888a6306c43f8ab6fcdb0c28be34e1c9fa17a4ed

## Verdict
PASS - Daily report deterministic, uses foundation_render
