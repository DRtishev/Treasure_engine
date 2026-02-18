# E118 NET PROOF REAL
- binance | WS | wss://stream.binance.com:9443/ws/btcusdt@kline_5m | attempt=1 | status=FAIL | reason_code=E_PROVIDER_DOWN | rtt_ms=74 | schema_ok=false | non_empty=false
- binance | REST | https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=5m&limit=5 | attempt=1 | status=FAIL | reason_code=E_PROVIDER_DOWN | rtt_ms=156 | schema_ok=false | non_empty=false
- bybit | WS | wss://stream.bybit.com/v5/public/linear | attempt=1 | status=FAIL | reason_code=E_PROVIDER_DOWN | rtt_ms=103 | schema_ok=false | non_empty=false
- bybit | REST | https://api.bybit.com/v5/market/kline?category=linear&symbol=BTCUSDT&interval=5&limit=5 | attempt=1 | status=FAIL | reason_code=E_PROVIDER_DOWN | rtt_ms=136 | schema_ok=false | non_empty=false
- kraken | WS | wss://ws.kraken.com/v2 | attempt=1 | status=FAIL | reason_code=E_PROVIDER_DOWN | rtt_ms=134 | schema_ok=false | non_empty=false
- kraken | REST | https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=5 | attempt=1 | status=FAIL | reason_code=E_PROVIDER_DOWN | rtt_ms=36 | schema_ok=false | non_empty=false
