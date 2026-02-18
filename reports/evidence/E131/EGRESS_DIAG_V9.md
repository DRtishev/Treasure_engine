# E131 EGRESS DIAG V9
- mode: ONLINE_REQUIRED
- enabled: true
- force_net_down: true
- rest_ok: false
- ws_handshake_ok: false
- ws_event_ok: false
- probe_example_com_reason: E_NET_BLOCKED
- stage_codes: E_DNS_FAIL, E_TCP_FAIL, E_TLS_FAIL, E_HTTP_FAIL, E_WS_HANDSHAKE_FAIL, E_WS_HANDSHAKE_OK_BUT_NO_EVENT, E_OK
