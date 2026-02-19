# E134 PROXY DISPATCHER
- implementation: core/transport/e134_proxy_dispatcher.mjs
- dispatch_policy: ENABLE_NET=1 + ONLINE_OPTIONAL/REQUIRED + I_UNDERSTAND_LIVE_RISK=1
- redaction: proxy_shape_hash only
## diag_stdout
```
# E134 EGRESS DIAG V10
- mode: ONLINE_OPTIONAL
- enabled: true
- force_net_down: false
- ip_pref: auto
- reason_codes: E_HTTP_FAIL,E_WS_HANDSHAKE_FAIL
# E134 TRANSPORT STAGE MATRIX
- proxy_scheme: HTTP
- proxy_shape_hash: 0fd7ca19c3f0dce31f10520270c48a57118db19b09f41ce39706ab2de28833e7
- ca_present: true
- dispatcher_mode: env_proxy
| scenario | target | ip_family | dns_ok | tcp_ok | tls_ok | http_ok | ws_handshake_ok | ws_event_ok | tcp_to_proxy_ok | connect_tunnel_ok | tls_over_tunnel_ok | http_over_tunnel_ok | ws_over_tunnel_ok | rtt_ms | bytes | reason_code |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---:|---:|---|
| direct | https://api.binance.com/api/v3/time | auto | true | true | true | false | false | false | true | true | true | true | false | 537 | 224 | E_HTTP_FAIL |
| direct | wss://stream.binance.com:443/ws/btcusdt@trade | auto | true | true | true | false | false | false | true | true | true | false | true | 307 | 0 | E_WS_HANDSHAKE_FAIL |
| proxy | https://api-testnet.bybit.com/v5/market/time | auto | true | true | true | false | false | false | true | true | true | true | false | 574 | 986 | E_HTTP_FAIL |
| proxy | wss://stream-testnet.bybit.com/v5/public/linear | auto | true | true | true | false | false | false | true | true | true | false | true | 383 | 0 | E_WS_HANDSHAKE_FAIL |
# E134 PROXY BREAKOUT MATRIX
- direct_stages: dns_ok,tcp_ok,tls_ok,http_ok,ws_handshake_ok,ws_event_ok
- proxy_stages: tcp_to_proxy_ok,connect_tunnel_ok,tls_over_tunnel_ok,http_over_tunnel_ok,ws_over_tunnel_ok
- strict_reason_codes: E_DNS_FAIL,E_TCP_FAIL,E_TLS_FAIL,E_HTTP_FAIL,E_WS_HANDSHAKE_FAIL,E_WS_EVENT_TIMEOUT,E_PROXY_CONNECT_FAIL,E_PROXY_TUNNEL_FAIL,E_PROXY_AUTH_REQUIRED,E_NET_BLOCKED,E_TIMEOUT,E_OK
(node:11202) [UNDICI-EHPA] Warning: EnvHttpProxyAgent is experimental, expect them to change at any time.
(Use `node --trace-warnings ...` to show where the warning was created)
```
