# E134 TRANSPORT STAGE MATRIX
- proxy_scheme: HTTP
- proxy_shape_hash: 0fd7ca19c3f0dce31f10520270c48a57118db19b09f41ce39706ab2de28833e7
- ca_present: true
- dispatcher_mode: env_proxy
| scenario | target | ip_family | dns_ok | tcp_ok | tls_ok | http_ok | ws_handshake_ok | ws_event_ok | tcp_to_proxy_ok | connect_tunnel_ok | tls_over_tunnel_ok | http_over_tunnel_ok | ws_over_tunnel_ok | rtt_ms | bytes | reason_code |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---:|---:|---|
| direct | https://api.binance.com/api/v3/time | auto | true | true | true | false | false | false | true | true | true | true | false | 411 | 224 | E_HTTP_FAIL |
| direct | wss://stream.binance.com:443/ws/btcusdt@trade | auto | true | true | true | false | false | false | true | true | true | false | true | 238 | 0 | E_WS_HANDSHAKE_FAIL |
| proxy | https://api-testnet.bybit.com/v5/market/time | auto | true | true | true | false | false | false | true | true | true | true | false | 279 | 986 | E_HTTP_FAIL |
| proxy | wss://stream-testnet.bybit.com/v5/public/linear | auto | true | true | true | false | false | false | true | true | true | false | true | 217 | 0 | E_WS_HANDSHAKE_FAIL |
