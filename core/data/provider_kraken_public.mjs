export const providerKrakenPublic = {
  name: 'kraken',
  endpoints: ['https://api.kraken.com/0/public/Time','https://api.kraken.com/0/public/OHLC'],
  async fetchOHLCV({ limit = 200 }) {
    const r = await fetch(`https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=5`);
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    const arr = j?.result?.XXBTZUSD || j?.result?.XBTUSD || [];
    const bars = arr.slice(-limit).map(x => ({ ts:Number(x[0])*1000, o:Number(x[1]), h:Number(x[2]), l:Number(x[3]), c:Number(x[4]), v:Number(x[6]) }));
    return { bars, provider_meta:{ provider:'kraken', mapped_symbol:'XBTUSD' } };
  }
};
