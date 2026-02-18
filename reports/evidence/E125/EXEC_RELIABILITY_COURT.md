# E125 EXEC RELIABILITY COURT
- bucket_counts: DNS=0,TLS=0,WS_UPGRADE=1,REST_EMPTY=1,RATE_LIMIT=0,TIME_DRIFT=1,AUTH=0,NO_FILL=1,SPREAD_TOO_WIDE=0
- top_blockers: E_NET_BLOCKED,E_WS_UPGRADE_FAIL,E_NO_FILL
- operator_actions: enable egress to testnet WS/REST; verify drift sync; rerun armed probe in ONLINE_REQUIRED.
