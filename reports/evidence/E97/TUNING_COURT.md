# E97 Envelope Tuning Court
- anchor_e96_risk_envelopes: PRESENT
- anchor_profit_ledger_state: PRESENT
- anchor_cadence_ledger_state: BTCUSDT,ETHUSDT,SOLUSDT
- anchor_reason_history_state: BTCUSDT,ETHUSDT,SOLUSDT
- symbols_total: 3
- symbols_touched_budgeted: 1
- reason_codes_present: PROFIT_SLIPPAGE,PROFIT_LATENCY,PROFIT_SPREAD,INVALID_RATE,INSUFFICIENT_DAYS
| symbol | days | pnl_usd_avg | latency_ms_avg | spread_bps_avg | fill_rate_avg | action | reason_code |
|---|---:|---:|---:|---:|---:|---|---|
| BTCUSDT | 3 | 105.0333 | 31.3333 | 2.1333 | 0.9703 | OBSERVE | INSUFFICIENT_DAYS |
| ETHUSDT | 3 | -12.0167 | 40.6667 | 3.6333 | 0.9327 | TIGHTEN | PROFIT_SLIPPAGE |
| SOLUSDT | 3 | 11.7500 | 44.0000 | 4.0333 | 0.9273 | OBSERVE | INSUFFICIENT_DAYS |
