const BASE = 'https://www.okx.com';
const TF_MAP = { '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m', '1h': '1H', '4h': '4H', '1d': '1D' };

async function getJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return r.json();
}

function mapSymbol(symbol) {
  return symbol.replace('USDT', '-USDT');
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
  id: 'okx',
  async getServerTime() {
    const j = await getJson(`${BASE}/api/v5/public/time`);
    return Number(j?.data?.[0]?.ts || 0);
  },
  async probe(symbol, tf) {
    const t = await this.getServerTime();
    const bar = TF_MAP[tf] || '5m';
    const instId = mapSymbol(symbol);
    const j = await getJson(`${BASE}/api/v5/market/candles?instId=${instId}&bar=${bar}&limit=3`);
    return { serverTimeMs: t, rows: mapRows(symbol, tf, (j?.data || []).reverse()) };
  },
  async fetchCandles(symbol, tf, _endTimeMs, limit) {
    const bar = TF_MAP[tf] || '5m';
    const instId = mapSymbol(symbol);
    const j = await getJson(`${BASE}/api/v5/market/candles?instId=${instId}&bar=${bar}&limit=${limit}`);
    return mapRows(symbol, tf, (j?.data || []).reverse());
  },
};
