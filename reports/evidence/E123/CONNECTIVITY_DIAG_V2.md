# E123 CONNECTIVITY DIAG V2
- mode: ONLINE_OPTIONAL
- enabled: true
- rest_ok: false
- ws_ok: false
- quorum_success: false
| provider | channel | endpoint | ok | reason_code | rtt_ms | ts_utc | mode | quorum_group |
|---|---|---|---|---|---:|---|---|---|
| BYBIT_TESTNET | DNS | api-testnet.bybit.com | true | OK | 183 | 2026-02-18T12:08:47.780Z | ONLINE_OPTIONAL | G1 |
| BYBIT_TESTNET | REST | https://api-testnet.bybit.com/v5/market/time | false | E_NET_BLOCKED | 226 | 2026-02-18T12:08:47.780Z | ONLINE_OPTIONAL | G1 |
| BYBIT_TESTNET | WS | wss://stream-testnet.bybit.com/v5/public/linear | false | E_TLS_FAIL | 0 | 2026-02-18T12:08:47.780Z | ONLINE_OPTIONAL | G1 |
