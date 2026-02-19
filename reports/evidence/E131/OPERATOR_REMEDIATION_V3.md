# E131 OPERATOR REMEDIATION V3
- E_BAD_SCHEMA: Inspect EGRESS_DIAG_V9 and rerun with FORCE_IPV4=1 / proxy fixes.
- E_HTTP_FAIL: Provider responded non-success. Validate endpoint and upstream health.
- E_OK: Inspect EGRESS_DIAG_V9 and rerun with FORCE_IPV4=1 / proxy fixes.
- E_WS_HANDSHAKE_FAIL: Proxy/firewall may block websocket upgrade; allow GET + Upgrade.
