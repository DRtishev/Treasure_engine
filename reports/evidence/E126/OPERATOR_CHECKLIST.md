# E126 OPERATOR CHECKLIST
- E_DNS_FAIL: Set resolver (1.1.1.1/8.8.8.8) then rerun `CI=false ENABLE_NET=1 I_UNDERSTAND_LIVE_RISK=1 ONLINE_OPTIONAL=1 npm run -s verify:e126:diag`.
- E_TLS_FAIL: Sync system clock (NTP), disable TLS interception, rerun diag command.
- E_NET_BLOCKED/E_TCP_FAIL: Check firewall/VPN/IPv6 route, test mobile hotspot, rerun diag command.
- E_WS_NO_EVENT: Switch provider/channel and rerun diag command.
- E_RATE_LIMIT: Increase ATTEMPT_SPACING_SEC and rerun update command.
