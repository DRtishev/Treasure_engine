const BASE = 'https://api.binance.com';

async function getJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return r.json();
}

function mapKlines(symbol, tf, rows) {
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
  id: 'binance',
  async getServerTime() {
    const j = await getJson(`${BASE}/api/v3/time`);
    return Number(j.serverTime);
  },
  async probe(symbol, tf) {
    const t = await this.getServerTime();
    const rows = await getJson(`${BASE}/api/v3/klines?symbol=${symbol}&interval=${tf}&limit=3&endTime=${t}`);
    return { serverTimeMs: t, rows: mapKlines(symbol, tf, rows) };
  },
  async fetchCandles(symbol, tf, endTimeMs, limit) {
    const rows = await getJson(`${BASE}/api/v3/klines?symbol=${symbol}&interval=${tf}&limit=${limit}&endTime=${endTimeMs}`);
    return mapKlines(symbol, tf, rows);
  },
};
