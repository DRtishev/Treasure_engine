# E114 NET PROOF
- mode: ONLINE_OPTIONAL
- endpoint_attempts: 8
- provider_success_count: 0
- quorum_pass: no
- status: WARN
## Providers
- bybit: success=0/2
- binance: success=0/2
- kraken: success=0/2
- coingecko: success=0/2
## Endpoint Reason Codes
- bybit|https://api.bybit.com/v5/market/time: FAIL (E_FETCH_FAIL)
- bybit|https://api.bybit.com/v5/market/kline: FAIL (E_FETCH_FAIL)
- binance|https://api.binance.com/api/v3/time: FAIL (E_FETCH_FAIL)
- binance|https://api.binance.com/api/v3/klines: FAIL (E_FETCH_FAIL)
- kraken|https://api.kraken.com/0/public/Time: FAIL (E_FETCH_FAIL)
- kraken|https://api.kraken.com/0/public/OHLC: FAIL (E_FETCH_FAIL)
- coingecko|https://api.coingecko.com/api/v3/ping: FAIL (E_FETCH_FAIL)
- coingecko|https://api.coingecko.com/api/v3/coins/bitcoin/ohlc: FAIL (E_FETCH_FAIL)
