import { mapSymbol } from './provider_maps.mjs';
export const providerCoingeckoLive = {
  name: 'coingecko',
  endpoints: ['https://api.coingecko.com/api/v3/ping', 'https://api.coingecko.com/api/v3/coins/{id}/ohlc'],
  async fetchOHLCV({ symbol, limit = 200 }) {
    const id = mapSymbol('coingecko', symbol);
    const r = await fetch(`https://api.coingecko.com/api/v3/coins/${id}/ohlc?vs_currency=usd&days=30`);
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    return { bars: (Array.isArray(j) ? j : []).slice(-limit).map(x => ({ ts: Number(x[0]), o: Number(x[1]), h: Number(x[2]), l: Number(x[3]), c: Number(x[4]), v: 0 })), provider_meta: { provider: 'coingecko', limitation: 'volume_zero' } };
  }
};
