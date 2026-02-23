# HYPOTHESES_SSOT.md — EDGE_PROFIT_00

Schema (strict):
- One row per hypothesis using pipe-delimited format.
- Format: `id|name|params_json|timeframe|venue|expected_edge_type|status`
- `id` must match `HYP-\d{4}`.
- `params_json` must be valid JSON object.

HYP-0001|BTC mean-reversion micro swing (paper only)|{"lookback_bars":48,"z_entry":2.2,"z_exit":0.6}|5m|BINANCE_SPOT|MEAN_REVERSION|CANDIDATE
HYP-0002|ETH momentum continuation with latency-aware exits (paper only)|{"breakout_bars":24,"trail_bps":14,"max_latency_ms":350}|1m|BINANCE_SPOT|MOMENTUM|CANDIDATE
