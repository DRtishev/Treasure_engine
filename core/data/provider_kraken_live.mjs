import { mapSymbol, mapTimeframe } from './provider_maps.mjs';
export const providerKrakenLive = {
  name: 'kraken',
  endpoints: ['https://api.kraken.com/0/public/Time', 'https://api.kraken.com/0/public/OHLC'],
  async fetchOHLCV({ symbol, tf = '5m', limit = 200 }) {
    const s = mapSymbol('kraken', symbol); const i = mapTimeframe('kraken', tf);
    const r = await fetch(`https://api.kraken.com/0/public/OHLC?pair=${s}&interval=${i}`);
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    const k = Object.keys(j?.result || {}).find(x => x !== 'last');
    const arr = k ? j.result[k] : [];
    return { bars: arr.slice(-limit).map(x => ({ ts: Number(x[0]) * 1000, o: Number(x[1]), h: Number(x[2]), l: Number(x[3]), c: Number(x[4]), v: Number(x[6]) })), provider_meta: { provider: 'kraken', symbol: s, tf: i } };
  }
};
