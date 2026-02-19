# E133 TRANSPORT STAGE MATRIX
- proxy_scheme: HTTP
- proxy_shape_hash: 0fd7ca19c3f0dce31f10520270c48a57118db19b09f41ce39706ab2de28833e7
- ca_present: true
- dispatcher_mode: env_proxy
| provider | channel | dns_ok | tcp_ok | tls_ok | http_ok | ws_handshake_ok | ws_event_ok | tcp_to_proxy_ok | connect_tunnel_ok | tls_over_tunnel_ok | http_over_tunnel_ok | ws_over_tunnel_ok | reason_code |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BINANCE | REST | true | true | true | false | false | false | true | true | true | true | false | E_HTTP_FAIL |
| BINANCE | WS | true | true | true | false | false | false | true | true | true | false | true | E_WS_HANDSHAKE_FAIL |
| BYBIT | REST | true | true | true | false | false | false | true | true | true | true | false | E_HTTP_FAIL |
| BYBIT | WS | true | true | true | false | false | false | true | true | true | false | true | E_WS_HANDSHAKE_FAIL |
| PUBLIC | REST | true | true | true | true | false | false | true | true | true | true | false | E_BAD_SCHEMA |
