# E92 EV DELTA COURT
- start_utc: 2023-10-16
- end_utc: 2023-11-14
- ev_score_formula: -(wR*reject_rate + wH*hold_rate + wP*park_rate + wI*invalid_rate + wS*avg_spread + wSL*abs(avg_slippage) + wF*avg_fee)
- weight_vector: wR=1.0,wH=0.7,wP=0.9,wI=0.6,wS=0.4,wSL=0.2,wF=0.1

| symbol | days_observed | rejects_count | holds_count | parks_count | reject_rate | hold_rate | park_rate | clean_days_streak_end | avg_spread | avg_slippage | avg_fee | invalid_rate | latency_bucket_mode | ev_score |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---:|
| BTCUSDT | 1 | 0 | 1 | 0 | 0.0000 | 1.0000 | 0.0000 | 0 | 0.8000 | 0.0000 | 0.4450 | 0.0000 | LT_100MS | -1.0645 |
| ETHUSDT | 1 | 0 | 1 | 0 | 0.0000 | 1.0000 | 0.0000 | 0 | 0.7000 | 0.0001 | 0.2000 | 0.0000 | LT_250MS | -1.0000 |
| SOLUSDT | 1 | 0 | 1 | 0 | 0.0000 | 1.0000 | 0.0000 | 0 | 0.5000 | 0.0009 | 0.1008 | 0.0000 | LT_250MS | -0.9103 |
- ev_delta_court_fingerprint: ed3d86da8c0e7268787d26422757c2df51ea9f4e2d13473f902e0cf4e9a87b63
