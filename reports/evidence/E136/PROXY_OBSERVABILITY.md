# E136 PROXY OBSERVABILITY
- doctrine: redact_all_external_endpoints
- host_representation: scheme + sha256(host:port)[0:16] (shape_hash)
- credential_logging: NEVER
- raw_url_logging: NEVER
## Direct Path Stages
| stage | flag | failure_code |
|---|---|---|
| DNS resolution | dns_ok | E_DNS_FAIL |
| TCP connect | tcp_ok | E_TCP_FAIL |
| TLS handshake | tls_ok | E_TLS_FAIL |
| HTTP GET 2xx | http_ok | E_HTTP_FAIL |
| WS upgrade 101 | ws_handshake_ok | E_WS_HANDSHAKE_FAIL |
| WS message echo | ws_event_ok | E_WS_EVENT_FAIL |
## Proxy CONNECT Tunnel Stages
| stage | flag | failure_code |
|---|---|---|
| TCP to proxy | tcp_to_proxy_ok | E_PROXY_CONNECT_FAIL |
| CONNECT tunnel 200 | connect_tunnel_ok | E_PROXY_CONNECT_FAIL |
| TLS over tunnel | tls_over_tunnel_ok | E_TLS_FAIL |
| HTTP over tunnel | http_over_tunnel_ok | E_HTTP_FAIL |
| WS over tunnel | ws_over_tunnel_ok | E_WS_HANDSHAKE_FAIL |
## Failure Classification
| condition | reason_code |
|---|---|
| Proxy rejects CONNECT | E_PROXY_CONNECT_FAIL |
| Proxy tunnel fails | E_PROXY_TUNNEL_FAIL |
| Proxy demands auth | E_PROXY_AUTH_REQUIRED |
| Policy/ACL blocks | E_POLICY_BLOCKED |
| DNS not resolving | E_DNS_FAIL |
| TCP timeout/refuse | E_TCP_FAIL |
| TLS cert/timeout | E_TLS_FAIL |
| HTTP non-2xx | E_HTTP_FAIL |
| WS upgrade fails | E_WS_HANDSHAKE_FAIL |
| WS message timeout | E_WS_EVENT_FAIL |
| All good | OK |
