export const providerCoingeckoOHLC = {
  name: 'coingecko',
  endpoints: ['https://api.coingecko.com/api/v3/ping','https://api.coingecko.com/api/v3/coins/bitcoin/ohlc'],
  async fetchOHLCV({ limit = 200 }) {
    const r = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=30');
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    const bars = (Array.isArray(j)?j:[]).slice(-limit).map(x => ({ ts:Number(x[0]), o:Number(x[1]), h:Number(x[2]), l:Number(x[3]), c:Number(x[4]), v:0 }));
    return { bars, provider_meta:{ provider:'coingecko', limitation:'volume_unavailable_set_zero' } };
  }
};
