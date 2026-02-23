const BASE = 'https://api.bybit.com';
const TF_MAP = { '1m': '1', '5m': '5', '15m': '15', '30m': '30', '1h': '60', '4h': '240', '1d': 'D' };

async function getJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return r.json();
}

function mapRows(symbol, tf, rows) {
  return rows.map((k) => ({
    symbol,
    tf,
    ts_open_ms: Number(k[0]),
    o: Number(k[1]),
    h: Number(k[2]),
    l: Number(k[3]),
    c: Number(k[4]),
    v: Number(k[5]),
  }));
}

export const provider = {
  id: 'bybit',
  async getServerTime() {
    const j = await getJson(`${BASE}/v5/market/time`);
    return Number(j?.result?.timeSecond || 0) * 1000;
  },
  async probe(symbol, tf) {
    const t = await this.getServerTime();
    const iv = TF_MAP[tf] || '5';
    const j = await getJson(`${BASE}/v5/market/kline?category=spot&symbol=${symbol}&interval=${iv}&limit=3`);
    return { serverTimeMs: t, rows: mapRows(symbol, tf, (j?.result?.list || []).reverse()) };
  },
  async fetchCandles(symbol, tf, _endTimeMs, limit) {
    const iv = TF_MAP[tf] || '5';
    const j = await getJson(`${BASE}/v5/market/kline?category=spot&symbol=${symbol}&interval=${iv}&limit=${limit}`);
    return mapRows(symbol, tf, (j?.result?.list || []).reverse());
  },
};
