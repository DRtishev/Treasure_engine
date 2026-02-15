# E75 EXEC RECON
- paper_adapter: deterministic fill model (offline, no network)
- demo_adapter: Bybit demo skeleton behind ENABLE_DEMO_ADAPTER=1
- WARNING: demo adapter off in CI/tests by design.
- expected_vs_filled_fields: expected_price, filled_price, expected_vs_filled_bps, fee, slippage, delay_ms
- tolerance_warn: 12bps / 80ms
- tolerance_alert: 25bps / 140ms
