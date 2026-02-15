# E77 EXEC RECON MULTI
- mode: fixture-first
- source_file: core/edge/fixtures/e77_recon_observed_multi.csv
- source_sha256: 425e327472dd24cb40efc351be70fb1c64df4960ed2567c507e876190615bd0d
- normalized_rows_hash: 352e04295d963bdc10640c3cd1e7339d6d934c265641ef5bdb845d65dad25624
- recon_fingerprint: 1ee34789a86a98a2403a58be2a126b543bb3417428658e6aaa65198026a7e503

| symbol | fee_median | spread_median | spread_p95 | slip_small | slip_medium | slip_large | lat_median | lat_p95 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| BTCUSDT | 0.3765 | 1.9 | 2.4 | 2.2 | 3.1 | 3.1 | 58 | 63 |
| ETHUSDT | 0.3208 | 2.1 | 2.7 | 2.4 | 2.9 | 2.9 | 49 | 57 |
| SOLUSDT | 0.4255 | 2.6 | 3 | 2.8 | 3.2 | 3.2 | 42 | 47 |

| symbol | window | trades | slippage_median | latency_median |
|---|---|---:|---:|---:|
| BTCUSDT | W1 | 2 | 2.1 | 52 |
| BTCUSDT | W2 | 2 | 3.1 | 63 |
| ETHUSDT | W1 | 2 | 2 | 44 |
| ETHUSDT | W3 | 2 | 2.9 | 57 |
| SOLUSDT | W2 | 2 | 2.6 | 39 |
| SOLUSDT | W3 | 2 | 3.2 | 47 |
