# E122 CONNECTIVITY DIAG
- mode: ONLINE_OPTIONAL
- enabled: true
- success: 2
- total: 6
- quorum_ok: true
- status: PASS
| provider | channel | endpoint | ok | reason_code | rtt_ms | ts_utc |
|---|---|---|---|---|---:|---|
| BYBIT_TESTNET | DNS | api-testnet.bybit.com | true | OK | 119 | 2026-02-18T11:52:54.412Z |
| BYBIT_TESTNET | HTTPS | https://api-testnet.bybit.com/v5/market/time | false | E_NET_BLOCKED | 206 | 2026-02-18T11:52:54.412Z |
| BYBIT_TESTNET | WS | wss://stream-testnet.bybit.com/v5/public/linear | false | E_TLS_FAIL | 0 | 2026-02-18T11:52:54.412Z |
| BINANCE | DNS | api.binance.com | true | OK | 158 | 2026-02-18T11:52:54.412Z |
| BINANCE | HTTPS | https://api.binance.com/api/v3/time | false | E_NET_BLOCKED | 198 | 2026-02-18T11:52:54.412Z |
| BINANCE | WS | wss://stream.binance.com:9443/ws/btcusdt@trade | false | E_TLS_FAIL | 0 | 2026-02-18T11:52:54.412Z |
