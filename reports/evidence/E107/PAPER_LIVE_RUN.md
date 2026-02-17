# E107 PAPER-LIVE RUN

## Track 3: Paper-Live Runner

### Components
- core/live/feed.mjs: Feed abstraction (fixture/live modes)
- core/paper/paper_live_runner.mjs: Paper-live loop
- scripts/report/e107_daily_report.mjs: Report generator

### Run Parameters
- feed: fixture (data/fixtures/e107/e107_ohlcv_fixture.json)
- initial_capital: 10000 USDT
- date: 2026-01-01
- run_id: E107-EVIDENCE-001

### Results
- status: COMPLETED
- ticks_processed: 20
- fills_count: 13
- risk_events: 0

### Risk Events
None

### Determinism Proof
- run1_report_hash: d7d59d79562d468a7a9cd37d748c7e2ee6229fe15a13acbdd98320618868ec69
- run2_report_hash: d7d59d79562d468a7a9cd37d748c7e2ee6229fe15a13acbdd98320618868ec69
- match: PASS

### Generated Report
```markdown
# E107 Daily Report: 2026-01-01
- run_id: E107-EVIDENCE-001
- generated: 2026-01-01T23:59:59Z

## PnL Summary
| Metric | Value |
| --- | --- |
| Initial Capital | 10000.00 USDT |
| Equity | 10000.34 USDT |
| Realized PnL | -4.9755 USDT |
| Unrealized PnL | 5.3143 USDT |
| Total PnL | 0.3388 USDT |
| Return % | 0.0034% |
| Total Fees | 2.6000 USDT |
| Total Slippage | 1.3000 USDT |
| Max Drawdown | 0.0498% |
| Total Fills | 13 |

## Trades
| trade_id | ts | symbol | side | qty | price | exec_price | fee | slippage | realized_pnl |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T000001 | 1704067800000 | BTCUSDT | BUY | 0.011834 | 42250.00 | 42258.45 | 0.2000 | 0.1000 | 0.0000 |
| T000002 | 1704068100000 | BTCUSDT | SELL | 0.011882 | 42080.00 | 42071.58 | 0.2000 | 0.1000 | -2.4114 |
| T000003 | 1704068400000 | BTCUSDT | SELL | 0.011919 | 41950.00 | 41941.61 | 0.2000 | 0.1000 | 0.0000 |
| T000004 | 1704069000000 | BTCUSDT | BUY | 0.011862 | 42150.00 | 42158.43 | 0.2000 | 0.1000 | 0.0000 |
| T000005 | 1704069300000 | BTCUSDT | BUY | 0.011820 | 42300.00 | 42308.46 | 0.2000 | 0.1000 | 0.0000 |
| T000006 | 1704069600000 | BTCUSDT | BUY | 0.011798 | 42380.00 | 42388.48 | 0.2000 | 0.1000 | 0.0000 |
| T000007 | 1704070500000 | BTCUSDT | BUY | 0.011770 | 42480.00 | 42488.50 | 0.2000 | 0.1000 | 0.0000 |
| T000008 | 1704070800000 | BTCUSDT | BUY | 0.011759 | 42520.00 | 42528.50 | 0.2000 | 0.1000 | 0.0000 |
| T000009 | 1704071100000 | BTCUSDT | BUY | 0.011745 | 42570.00 | 42578.51 | 0.2000 | 0.1000 | 0.0000 |
| T000010 | 1704071400000 | BTCUSDT | SELL | 0.011792 | 42400.00 | 42391.52 | 0.2000 | 0.1000 | -0.3943 |
| T000011 | 1704071700000 | BTCUSDT | SELL | 0.011834 | 42250.00 | 42241.55 | 0.2000 | 0.1000 | -2.1698 |
| T000012 | 1704072300000 | BTCUSDT | BUY | 0.011787 | 42420.00 | 42428.48 | 0.2000 | 0.1000 | 0.0000 |
| T000013 | 1704072600000 | BTCUSDT | BUY | 0.011770 | 42480.00 | 42488.50 | 0.2000 | 0.1000 | 0.0000 |

## Drawdown
- max_drawdown: 0.0498%
- high_watermark: 10000.00 USDT

## Anomalies
No anomalies detected.

## Status
- verdict: CLEAN
- fills: 13
- pnl: 0.3388
```

## Verdict
PASS - Paper-live loop completed, deterministic
