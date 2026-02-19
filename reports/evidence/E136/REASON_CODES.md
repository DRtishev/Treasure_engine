# E136 REASON CODES
## Canonical Codes
| code | description |
|---|---|
| OK | All probed stages succeeded |
| E_DNS_FAIL | DNS resolution failed (NXDOMAIN or timeout) |
| E_TCP_FAIL | TCP connect failed (ECONNREFUSED, EHOSTUNREACH, timeout) |
| E_TLS_FAIL | TLS handshake failed (cert error, timeout, protocol mismatch) |
| E_HTTP_FAIL | HTTP request failed or response not 2xx |
| E_WS_HANDSHAKE_FAIL | WebSocket upgrade failed (non-101 or timeout) |
| E_WS_EVENT_FAIL | WebSocket message not received or content mismatch |
| E_PROXY_CONNECT_FAIL | CONNECT request to proxy rejected or timed out |
| E_PROXY_TUNNEL_FAIL | CONNECT tunnel established but data path broken |
| E_PROXY_AUTH_REQUIRED | Proxy returned 407 Proxy Authentication Required |
| E_POLICY_BLOCKED | ACL/firewall/proxy policy rejected the request |
| E_NET_BLOCKED | ENABLE_NET not set; network calls forbidden in this mode |
| E_TIMEOUT | Generic timeout not covered by above categories |
## Stability Contract
- Codes are stable strings — never change them without a new epoch.
- Operators may match reason_code programmatically.
- Any new code must be added here before use.
