# E134 OPERATOR REACHABILITY RUNBOOK
- E_PROXY_CONNECT_FAIL: check proxy host/port ACL and route
- E_PROXY_TUNNEL_FAIL: verify CONNECT allowed for target host:port
- E_PROXY_AUTH_REQUIRED: provide proxy credentials via env without printing secrets
- E_HTTP_FAIL: verify upstream endpoint and proxy egress policy
- E_WS_HANDSHAKE_FAIL: allow websocket upgrade over path
- E_WS_EVENT_TIMEOUT: verify frame flow and provider liveness
- E_NET_BLOCKED: set ENABLE_NET=1 and I_UNDERSTAND_LIVE_RISK=1
