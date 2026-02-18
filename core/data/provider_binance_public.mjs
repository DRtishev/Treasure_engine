export const providerBinancePublic = {
  name: 'binance',
  endpoints: ['https://api.binance.com/api/v3/time','https://api.binance.com/api/v3/klines'],
  async fetchOHLCV({ symbol, limit = 200 }) {
    const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=5m&limit=${limit}`);
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    const bars = (Array.isArray(j)?j:[]).map(x => ({ ts:Number(x[0]), o:Number(x[1]), h:Number(x[2]), l:Number(x[3]), c:Number(x[4]), v:Number(x[5]) }));
    return { bars, provider_meta:{ provider:'binance' } };
  }
};
