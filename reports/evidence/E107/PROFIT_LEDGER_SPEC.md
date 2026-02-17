# E107 PROFIT LEDGER SPEC

## Track 2: Profit Ledger

### Module
- path: core/profit/ledger.mjs
- functions: createLedger, recordFill, getEquity, getUnrealizedPnL, getLedgerSummary, fillsToMarkdownTable, serializeLedger, detectAnomalies

### Fixture Test
- initial_capital: 10000 USDT
- fills: 3 (1 BUY, 2 SELL)

### Summary
- realized_pnl: 36.3000
- total_fees: 3.3800
- total_slippage: 2.0000
- max_drawdown: 0.0000%
- total_fills: 3

### Fills Table
| trade_id | ts | symbol | side | qty | price | exec_price | fee | slippage | realized_pnl |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T000001 | 2026-01-01T00:00:00Z | BTCUSDT | BUY | 0.100000 | 42000.00 | 42010.00 | 1.6800 | 1.0000 | 0.0000 |
| T000002 | 2026-01-01T00:05:00Z | BTCUSDT | SELL | 0.050000 | 42500.00 | 42490.00 | 0.8500 | 0.5000 | 23.1500 |
| T000003 | 2026-01-01T00:10:00Z | BTCUSDT | SELL | 0.050000 | 42300.00 | 42290.00 | 0.8500 | 0.5000 | 13.1500 |

### Determinism Proof
- serialized_hash: 256b28d7777ccd8b3374561bb4638ac22571f9e07515b76a5643bd375fede8c0

### Contract
- e107_profit_ledger_contract.mjs: 12 tests

## Verdict
PASS - Ledger deterministic, PnL computations verified
