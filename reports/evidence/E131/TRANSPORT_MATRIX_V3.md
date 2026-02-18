# E131 TRANSPORT MATRIX V3
- proxy_scheme: HTTP
- proxy_shape: http://proxy:8080
- proxy_shape_hash: e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09
- ca_present: true
- ip_family: auto
| target_id | provider | channel | endpoint | url_hash | dns_ok | tcp_ok | tls_ok | http_ok | ws_handshake_ok | ws_event_ok | rtt_ms | bytes | reason_code | proxy_shape_hash | ip_family |
|---|---|---|---|---|---|---|---|---|---|---|---:|---:|---|---|---|
| BINANCE-REST | BINANCE | REST | https://api.binance.com/api/v3/time | 938a97d4393b2a3c | false | false | false | false | false | false | 0 | 0 | E_NET_BLOCKED | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | auto |
| BINANCE-WS | BINANCE | WS | wss://stream.binance.com:443/ws/btcusdt@trade | a5f57b796f3e02a3 | false | false | false | false | false | false | 0 | 0 | E_NET_BLOCKED | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | auto |
| BYBIT-REST | BYBIT | REST | https://api-testnet.bybit.com/v5/market/time | 4165dd9e9a9ffcd8 | false | false | false | false | false | false | 0 | 0 | E_NET_BLOCKED | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | auto |
| BYBIT-WS | BYBIT | WS | wss://stream-testnet.bybit.com/v5/public/linear | d0fd5d4752acd291 | false | false | false | false | false | false | 0 | 0 | E_NET_BLOCKED | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | auto |
| KRAKEN-REST | KRAKEN | REST | https://api.kraken.com/0/public/Time | 342916025a0a4228 | false | false | false | false | false | false | 0 | 0 | E_NET_BLOCKED | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | auto |
| KRAKEN-WS | KRAKEN | WS | wss://ws.kraken.com | d93e637c6e844adc | false | false | false | false | false | false | 0 | 0 | E_NET_BLOCKED | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | auto |
| PUBLIC-REST | PUBLIC | REST | https://example.com/ | 0f115db062b7c0dd | false | false | false | false | false | false | 0 | 0 | E_NET_BLOCKED | e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09 | auto |
- rest_success: false
- ws_handshake_success: false
- ws_success: false
- public_probe_example_com: E_NET_BLOCKED
