# E110 DATA QUORUM V2

## Capsule Summary
| Symbol | TF | Bars | Source | First | Last | Chunks |
| --- | --- | --- | --- | --- | --- | --- |
| BTCUSDT | 5m | 200 | E109_CAPSULE | 2024-01-01T00:00:00.000Z | 2024-01-01T16:35:00.000Z | 1 |

## Quorum Checks (per symbol)
### BTCUSDT
- passed: 7/7
- bars: 200
- time_span_days: 0.69
- PASS min_bars: 200 >= 50
- PASS monotonic_ts: violations: 0
- PASS no_large_gaps: max_gap=300000ms, violations=0
- PASS no_duplicate_ts: unique=200, total=200
- PASS no_nan_values: nan_bars: 0
- PASS no_negative_volume: negative_vol_bars: 0
- PASS sane_ohlc: violations: 0

## Capsule Chunk Hashes
### e110_btcusdt_5m_200bar
- chunk_0000: d97bb02e3ffe2e45db8ccc0ad1d739f1b9175518ceb9b1903b850f5658881dad
