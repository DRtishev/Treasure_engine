# E127 EGRESS DIAG V6
- mode: ONLINE_OPTIONAL
- force_ipv4_effective: false
- proxy_scheme: NONE
- proxy_hash: NONE
- time_sync_drift_range_ms: NA
| target_id | provider | channel | endpoint | url_hash | dns_ok | tcp_ok | tls_ok | http_ok | ws_handshake_ok | ws_event_ok | rtt_ms | bytes | reason_code |
|---|---|---|---|---|---|---|---|---|---|---|---:|---:|---|
| BYBIT-REST | BYBIT | REST | https://api-testnet.bybit.com/v5/market/time | 4165dd9e9a9ffcd8 | true | false | false | false | false | false | 272 | 0 | E_TCP_FAIL |
| BYBIT-WS | BYBIT | WS | wss://stream-testnet.bybit.com/v5/public/linear | d0fd5d4752acd291 | true | false | false | false | false | false | 221 | 0 | E_TCP_FAIL |
| BINANCE-REST | BINANCE | REST | https://api.binance.com/api/v3/time | 938a97d4393b2a3c | true | false | false | false | false | false | 113 | 0 | E_TCP_FAIL |
| BINANCE-WS | BINANCE | WS | wss://stream.binance.com:9443/ws/btcusdt@trade | b22beb13c04522f6 | true | false | false | false | false | false | 102 | 0 | E_TCP_FAIL |
- rest_success: false
- ws_success: false
