# E128 EXECUTION FLOW V4
- dry_run_default: true
- live_gate: ENABLE_NET=1 + I_UNDERSTAND_LIVE_RISK=1 + ONLINE_REQUIRED=1 + ARMED_TESTNET=1 + QUORUM_FULL=1
- order_template: MARKET preferred for testnet fill with cap controls
- max_notional_usd: 15
- max_trades_per_day: 3
- cooldown_sec: 30
- sanitized_ids: order_id_hash, request_id_hash
