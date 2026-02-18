# E127 EXECUTION FLOW V3
- dry_run_default: true
- live_gate: ENABLE_NET=1 + I_UNDERSTAND_LIVE_RISK=1 + ONLINE_REQUIRED=1 + ARMED_TESTNET=1
- sanitized_identifiers: order_id_hash, request_id_hash
- one_shot_template: MARKET|LIMIT, deterministic size, notional <= MAX_NOTIONAL_USD
