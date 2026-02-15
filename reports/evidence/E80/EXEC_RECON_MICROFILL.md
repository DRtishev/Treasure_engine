# E80 EXEC RECON MICROFILL
- mode: DEMO_ONLY
- live_trading: DISABLED
- source_sha256: 7055348368490701c87c50fae03505bb023829a770c462d385b5a0f0696b2d96
- microfill_fingerprint: 78925cabbaf7f550f13faca825c2a0e835f152f552830e633d0f35c1c5d7b20b

## expected_vs_filled
- comparator: abs(filled_px-expected_px)/expected_px aggregated from observed fixture

- latency_buckets: {"lt150":9,"b150_200":9,"gte200":0}
- slippage_buckets: {"lt04":4,"b04_08":14,"gte08":0}
