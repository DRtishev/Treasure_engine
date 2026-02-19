# E131 TRANSPORT MATRIX V3
- proxy_scheme: HTTP
- proxy_shape_hash: 0fd7ca19c3f0dce31f10520270c48a57118db19b09f41ce39706ab2de28833e7
- ca_present: true
- ip_family: auto
- dispatcher_mode: env_proxy
| target_id | provider | channel | url_hash | dns_ok | tcp_ok | tls_ok | http_ok | ws_handshake_ok | ws_event_ok | tcp_to_proxy_ok | connect_tunnel_ok | tls_over_tunnel_ok | http_over_tunnel_ok | ws_over_tunnel_ok | rtt_ms | bytes | reason_code | proxy_shape_hash | ip_family |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---:|---:|---|---|---|
| BINANCE-REST | BINANCE | REST | 938a97d4393b2a3c | true | true | true | false | false | false | true | true | true | true | false | 710 | 224 | E_HTTP_FAIL | 0fd7ca19c3f0dce31f10520270c48a57118db19b09f41ce39706ab2de28833e7 | auto |
| BINANCE-WS | BINANCE | WS | a5f57b796f3e02a3 | true | true | true | false | false | false | true | true | true | false | true | 125 | 0 | E_WS_HANDSHAKE_FAIL | 0fd7ca19c3f0dce31f10520270c48a57118db19b09f41ce39706ab2de28833e7 | auto |
| BYBIT-REST | BYBIT | REST | 4165dd9e9a9ffcd8 | true | true | true | false | false | false | true | true | true | true | false | 846 | 986 | E_HTTP_FAIL | 0fd7ca19c3f0dce31f10520270c48a57118db19b09f41ce39706ab2de28833e7 | auto |
| BYBIT-WS | BYBIT | WS | d0fd5d4752acd291 | true | true | true | false | false | false | true | true | true | false | true | 417 | 0 | E_WS_HANDSHAKE_FAIL | 0fd7ca19c3f0dce31f10520270c48a57118db19b09f41ce39706ab2de28833e7 | auto |
| KRAKEN-REST | KRAKEN | REST | 342916025a0a4228 | true | true | true | true | false | false | true | true | true | true | false | 493 | 87 | E_OK | 0fd7ca19c3f0dce31f10520270c48a57118db19b09f41ce39706ab2de28833e7 | auto |
| KRAKEN-WS | KRAKEN | WS | d93e637c6e844adc | true | true | true | false | false | false | true | true | true | false | true | 91 | 0 | E_WS_HANDSHAKE_FAIL | 0fd7ca19c3f0dce31f10520270c48a57118db19b09f41ce39706ab2de28833e7 | auto |
| PUBLIC-REST | PUBLIC | REST | 0f115db062b7c0dd | true | true | true | true | false | false | true | true | true | true | false | 171 | 528 | E_BAD_SCHEMA | 0fd7ca19c3f0dce31f10520270c48a57118db19b09f41ce39706ab2de28833e7 | auto |
- rest_success: true
- ws_handshake_success: false
- ws_success: false
- public_probe_example_com: E_BAD_SCHEMA
