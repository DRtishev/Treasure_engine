export const CANONICAL_SYMBOLS = ['BTCUSDT', 'ETHUSDT'];

export const PROVIDER_SYMBOL_MAP = {
  bybit: { BTCUSDT: 'BTCUSDT', ETHUSDT: 'ETHUSDT' },
  binance: { BTCUSDT: 'BTCUSDT', ETHUSDT: 'ETHUSDT' },
  kraken: { BTCUSDT: 'XBTUSD', ETHUSDT: 'ETHUSD' },
  coingecko: { BTCUSDT: 'bitcoin', ETHUSDT: 'ethereum' }
};

export const PROVIDER_TF_MAP = {
  bybit: { '1m': '1', '3m': '3', '5m': '5', '15m': '15', '1h': '60', '4h': '240', '1d': 'D' },
  binance: { '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '1h': '1h', '4h': '4h', '1d': '1d' },
  kraken: { '1m': '1', '3m': '3', '5m': '5', '15m': '15', '1h': '60', '4h': '240', '1d': '1440' },
  coingecko: { '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '1h': '1h', '4h': '4h', '1d': '1d' }
};

export function mapSymbol(provider, symbol) {
  const m = PROVIDER_SYMBOL_MAP[provider]?.[symbol];
  if (!m) throw new Error('E_MAP_SYMBOL_MISSING');
  return m;
}

export function mapTimeframe(provider, tf) {
  const m = PROVIDER_TF_MAP[provider]?.[tf];
  if (!m) throw new Error('E_MAP_TF_MISSING');
  return m;
}

export function ensureProvider(provider) {
  if (!PROVIDER_SYMBOL_MAP[provider]) throw new Error('E_MAP_UNSUPPORTED');
}
