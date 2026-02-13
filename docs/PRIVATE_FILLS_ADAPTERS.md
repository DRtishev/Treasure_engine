# PRIVATE FILLS ADAPTERS

## Provider: Binance (file ingest)

| Normalized field | Accepted source columns |
|---|---|
| fill_id | fill_id, tradeId, execId, id |
| order_id | order_id, orderId, orderID |
| ts_ms | ts_ms, execTime, time, timestamp |
| symbol | symbol, instId |
| side | side, direction |
| qty | qty, executedQty, size |
| price | price, execPrice |
| fee | fee, commission |
| fee_asset | fee_asset, commissionAsset, feeCurrency |
| liquidity_flag | liquidity_flag, makerTaker, liquidity |

## Strict-mode requirements

- `fill_id` required (no heuristic id synthesis in strict mode).
- `ts_ms`, `symbol`, `side`, `qty`, `price` required.
- Missing required fields in strict mode => ingest FAIL.
