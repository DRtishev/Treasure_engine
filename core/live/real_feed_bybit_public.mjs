import fs from 'node:fs';
import path from 'node:path';

export async function fetchPublicCandles(symbol = 'BTCUSDT', interval = '5', limit = 24) {
  const ci = process.env.CI === 'true' || process.env.CI === '1';
  if (ci) throw new Error('NET_FORBIDDEN_IN_CI');
  if (process.env.ENABLE_NET !== '1') throw new Error('ENABLE_NET_REQUIRED');
  const u = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(u);
  const json = await res.json();
  const list = (json?.result?.list || []).map(r => ({ ts: Number(r[0]), price: Number(r[4]), symbol }));
  list.sort((a, b) => a.ts - b.ts);
  return list;
}

export function loadCachedCandles(symbol = 'BTCUSDT') {
  const p = path.resolve('.cache/e111/normalized', `${symbol}_5m.jsonl`);
  const rows = fs.readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
  return rows.slice(-24).map(r => ({ ts: r.ts, price: r.c, symbol }));
}
