# EXECUTION_REALITY.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: a0e3806a2bb8
NEXT_ACTION: npm run -s edge:profit:00:expectancy

## Reality Metrics

- fills_n: 360
- min_fills_required: 100
- fill_rate: UNAVAILABLE
- mean_slippage_bps: 2.505801
- median_slippage_bps: 2.526107
- p95_slippage_bps: 3.376297
- mean_latency_ms: 184.631754
- median_latency_ms: 176.715146
- p95_latency_ms: 304.809377
- mean_fee_bps: 0.350000

## Calibration

- model: predicted_slippage_bps = spread_bps/2 + k*sqrt(size_ratio)
- k: 1.14494483
- rmse_bps: 0.10124290
