# E128 EGRESS DIAG V7
- mode: ONLINE_OPTIONAL
- force_ipv4_effective: false
- prefer_ipv6_effective: false
- proxy_scheme: HTTP
- proxy_hash: e4d7783ba0b1d7118985e3de887cc689c23041057222c3ad01cb6c9885cc4b09
| target_id | provider | channel | endpoint | url_hash | family | rest_stack | dns_ok | tcp_ok | tls_ok | http_ok | ws_handshake_ok | ws_event_ok | handshake_rtt_ms | first_event_rtt_ms | rtt_ms | bytes | reason_code |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---:|---:|---:|---:|---|
| BINANCE-REST | BINANCE | REST | https://api.binance.com/api/v3/time | 938a97d4393b2a3c | auto | NA | true | false | false | false | false | false | NA | NA | 212 | 0 | E_TCP_FAIL |
| BINANCE-WS | BINANCE | WS | wss://stream.binance.com:9443/ws/btcusdt@trade | b22beb13c04522f6 | auto | NA | true | false | false | false | false | false | NA | NA | 180 | 0 | E_TCP_FAIL |
| BYBIT-REST | BYBIT | REST | https://api-testnet.bybit.com/v5/market/time | 4165dd9e9a9ffcd8 | auto | NA | true | false | false | false | false | false | NA | NA | 184 | 0 | E_TCP_FAIL |
| BYBIT-WS | BYBIT | WS | wss://stream-testnet.bybit.com/v5/public/linear | d0fd5d4752acd291 | auto | NA | true | false | false | false | false | false | NA | NA | 211 | 0 | E_TCP_FAIL |
- rest_success: false
- ws_success: false
