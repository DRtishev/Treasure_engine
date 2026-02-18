# E129 EGRESS DIAG V8
- mode: ONLINE_OPTIONAL
- proxy_scheme: HTTP
- proxy_shape_hash: e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09
- no_proxy: SET
| target_id | provider | channel | endpoint | url_hash | family | rest_stack | dns_ok | tcp_ok | tls_ok | http_ok | ws_handshake_ok | ws_event_ok | rest_payload_ok | handshake_rtt_ms | first_event_rtt_ms | rtt_ms | bytes | err_code | reason_code |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---:|---:|---:|---:|---|---|
| BINANCE-REST | BINANCE | REST | https://api.binance.com/api/v3/time | 938a97d4393b2a3c | auto | NA | true | false | false | false | false | false | false | NA | NA | 360 | 0 | ENETUNREACH | E_TIMEOUT |
| BINANCE-WS | BINANCE | WS | wss://stream.binance.com:9443/ws/btcusdt@trade | b22beb13c04522f6 | auto | NA | true | false | false | false | false | false | false | NA | NA | 122 | 0 | ENETUNREACH | E_TIMEOUT |
| BYBIT-REST | BYBIT | REST | https://api-testnet.bybit.com/v5/market/time | 4165dd9e9a9ffcd8 | auto | NA | true | false | false | false | false | false | false | NA | NA | 296 | 0 | ENETUNREACH | E_TIMEOUT |
| BYBIT-WS | BYBIT | WS | wss://stream-testnet.bybit.com/v5/public/linear | d0fd5d4752acd291 | auto | NA | true | false | false | false | false | false | false | NA | NA | 298 | 0 | ENETUNREACH | E_TIMEOUT |
| KRAKEN-REST | KRAKEN | REST | https://api.kraken.com/0/public/Time | 342916025a0a4228 | auto | NA | true | false | false | false | false | false | false | NA | NA | 85 | 0 | ENETUNREACH | E_TIMEOUT |
| KRAKEN-WS | KRAKEN | WS | wss://ws.kraken.com | d93e637c6e844adc | auto | NA | true | false | false | false | false | false | false | NA | NA | 81 | 0 | ENETUNREACH | E_TIMEOUT |
- rest_success: false
- ws_success: false
