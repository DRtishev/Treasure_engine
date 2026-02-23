const BASE = 'https://api.kraken.com';
const TF_MAP = { '1m': '1', '5m': '5', '15m': '15', '30m': '30', '1h': '60', '4h': '240', '1d': '1440' };

async function getJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return r.json();
}

function krakenPair(symbol) {
  if (symbol === 'BTCUSDT') return 'XBTUSDT';
  if (symbol === 'ETHUSDT') return 'ETHUSDT';
  return symbol;
}

function mapRows(symbol, tf, rows) {
  return rows.map((k) => ({
    symbol,
    tf,
    ts_open_ms: Number(k[0]) * 1000,
    o: Number(k[1]),
    h: Number(k[2]),
    l: Number(k[3]),
    c: Number(k[4]),
    v: Number(k[6]),
  }));
}

export const provider = {
  id: 'kraken',
  async getServerTime() {
    const j = await getJson(`${BASE}/0/public/Time`);
    return Number(j?.result?.unixtime || 0) * 1000;
  },
  async probe(symbol, tf) {
    const t = await this.getServerTime();
    const pair = krakenPair(symbol);
    const iv = TF_MAP[tf] || '5';
    const j = await getJson(`${BASE}/0/public/OHLC?pair=${pair}&interval=${iv}`);
    const key = Object.keys(j?.result || {}).find((k) => k !== 'last');
    const rows = key ? j.result[key] : [];
    return { serverTimeMs: t, rows: mapRows(symbol, tf, rows.slice(-3)) };
  },
  async fetchCandles(symbol, tf, _endTimeMs, _limit) {
    const pair = krakenPair(symbol);
    const iv = TF_MAP[tf] || '5';
    const j = await getJson(`${BASE}/0/public/OHLC?pair=${pair}&interval=${iv}`);
    const key = Object.keys(j?.result || {}).find((k) => k !== 'last');
    const rows = key ? j.result[key] : [];
    return mapRows(symbol, tf, rows);
  },
};
