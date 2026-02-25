# EXECUTION_REALITY.md

STATUS: PASS
REASON_CODE: NONE
RUN_ID: a0e3806a2bb8
NEXT_ACTION: npm run -s edge:profit:00:expectancy

## Reality Metrics

- fills_n: 360
- min_fills_required: 100
- fill_rate: UNAVAILABLE
- mean_slippage_bps: 1.986134
- median_slippage_bps: 1.993999
- p95_slippage_bps: 2.678527
- mean_latency_ms: 155.446076
- median_latency_ms: 151.521246
- p95_latency_ms: 255.980299
- mean_fee_bps: 0.300000

## Calibration

- model: predicted_slippage_bps = spread_bps/2 + k*sqrt(size_ratio)
- k: 0.99639787
- rmse_bps: 0.07298193
