import { mapSymbol, mapTimeframe } from './provider_maps.mjs';
export const providerBinanceLive = {
  name: 'binance',
  endpoints: ['https://api.binance.com/api/v3/time', 'https://api.binance.com/api/v3/klines'],
  async fetchOHLCV({ symbol, tf = '5m', limit = 200 }) {
    const s = mapSymbol('binance', symbol); const i = mapTimeframe('binance', tf);
    const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${s}&interval=${i}&limit=${limit}`);
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    return { bars: (Array.isArray(j) ? j : []).map(x => ({ ts: Number(x[0]), o: Number(x[1]), h: Number(x[2]), l: Number(x[3]), c: Number(x[4]), v: Number(x[5]) })), provider_meta: { provider: 'binance', symbol: s, tf: i } };
  }
};
