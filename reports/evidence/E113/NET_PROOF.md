# E113 NET PROOF
- mode: ONLINE_OPTIONAL
- network_attempted: yes
- endpoint_attempts: 8
- provider_success_count: 0
- quorum_rule: provider_success_count>=1 && endpoint_attempts>=2
- quorum_pass: no
- status: WARN
## Providers
- bybit: success=0/2
- binance: success=0/2
- kraken: success=0/2
- coinbase: success=0/2
## Endpoint Reason Codes
- bybit|https://api.bybit.com/v5/market/time: FAIL (FETCH_FAIL)
- bybit|https://api.bybit.com/v5/market/tickers?category=linear&symbol=BTCUSDT: FAIL (FETCH_FAIL)
- binance|https://api.binance.com/api/v3/time: FAIL (FETCH_FAIL)
- binance|https://api.binance.com/api/v3/ticker/bookTicker?symbol=BTCUSDT: FAIL (FETCH_FAIL)
- kraken|https://api.kraken.com/0/public/Time: FAIL (FETCH_FAIL)
- kraken|https://api.kraken.com/0/public/Ticker?pair=XBTUSD: FAIL (FETCH_FAIL)
- coinbase|https://api.exchange.coinbase.com/time: FAIL (FETCH_FAIL)
- coinbase|https://api.exchange.coinbase.com/products/BTC-USD/ticker: FAIL (FETCH_FAIL)
