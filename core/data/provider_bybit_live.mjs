import { mapSymbol, mapTimeframe } from './provider_maps.mjs';
export const providerBybitLive = {
  name: 'bybit',
  endpoints: ['https://api.bybit.com/v5/market/time', 'https://api.bybit.com/v5/market/kline'],
  async fetchOHLCV({ symbol, tf = '5m', limit = 200 }) {
    const s = mapSymbol('bybit', symbol); const i = mapTimeframe('bybit', tf);
    const r = await fetch(`https://api.bybit.com/v5/market/kline?category=linear&symbol=${s}&interval=${i}&limit=${limit}`);
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    const list = j?.result?.list || [];
    return { bars: list.map(x => ({ ts: Number(x[0]), o: Number(x[1]), h: Number(x[2]), l: Number(x[3]), c: Number(x[4]), v: Number(x[5]) })).sort((a, b) => a.ts - b.ts), provider_meta: { provider: 'bybit', symbol: s, tf: i } };
  }
};
