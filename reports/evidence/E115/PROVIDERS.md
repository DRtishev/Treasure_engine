# E115 PROVIDERS
- deterministic_order: bybit,binance,kraken,coingecko
- selected_provider: pinned:E115_1700000000
## Mapping
- bybit: canonical symbol passthrough, tf map
- binance: canonical symbol passthrough, tf map
- kraken: BTCUSDT->XBTUSD ETHUSDT->ETHUSD
- coingecko: symbol->coin id; limitation volume=0
