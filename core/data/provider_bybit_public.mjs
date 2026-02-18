export const providerBybitPublic = {
  name: 'bybit',
  endpoints: ['https://api.bybit.com/v5/market/time','https://api.bybit.com/v5/market/kline'],
  async fetchOHLCV({ symbol, limit = 200 }) {
    const r = await fetch(`https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=5&limit=${limit}`);
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    const list = j?.result?.list || [];
    const bars = list.map(x => ({ ts:Number(x[0]), o:Number(x[1]), h:Number(x[2]), l:Number(x[3]), c:Number(x[4]), v:Number(x[5]) })).sort((a,b)=>a.ts-b.ts);
    return { bars, provider_meta: { provider:'bybit' } };
  }
};
