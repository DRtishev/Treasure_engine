# E126 EGRESS DIAG V5
- mode: ONLINE_OPTIONAL
- proxy_scheme: NONE
- proxy_hash: NONE
| target_id | provider | channel | endpoint | url_hash | dns_ok | tcp_ok | tls_ok | http_status | ws_event | rtt_ms | bytes | schema_ok | non_empty | retries | time_drift_sec | reason_code |
|---|---|---|---|---|---|---|---|---|---|---:|---:|---|---|---:|---:|---|
| BYBIT-REST | BYBIT | REST | https://api-testnet.bybit.com/v5/market/time | 4165dd9e9a9ffcd8 | true | false | false | NA | false | 0 | 0 | false | false | 2 | NA | E_EMPTY |
| BYBIT-WS | BYBIT | WS | wss://stream-testnet.bybit.com/v5/public/linear | d0fd5d4752acd291 | true | false | false | NA | false | 0 | 0 | false | false | 2 | NA | E_WS_HANDSHAKE_FAIL |
| BINANCE-REST | BINANCE | REST | https://api.binance.com/api/v3/time | 938a97d4393b2a3c | true | false | false | NA | false | 0 | 0 | false | false | 2 | NA | E_EMPTY |
| BINANCE-WS | BINANCE | WS | wss://stream.binance.com:9443/ws/btcusdt@trade | b22beb13c04522f6 | true | false | false | NA | false | 0 | 0 | false | false | 2 | NA | E_WS_HANDSHAKE_FAIL |
