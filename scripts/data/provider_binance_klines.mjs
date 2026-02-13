#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ENABLE = process.env.ENABLE_NETWORK === '1';
if (!ENABLE) {
  console.log('SKIP network fetch (ENABLE_NETWORK!=1)');
  process.exit(0);
}

const symbol = process.env.SYMBOL || 'BTCUSDT';
const interval = process.env.INTERVAL || '1m';
const limit = Number(process.env.LIMIT || 50);
const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;

const res = await fetch(url);
if (!res.ok) throw new Error(`binance request failed: ${res.status}`);
const rows = await res.json();

const datasetId = `binance-${symbol}-${interval}`;
const outDir = path.join(process.cwd(), 'data/raw/binance', datasetId, 'chunks');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'chunk_0001.jsonl');
const normalized = rows.map((r) => ({
  type: 'candle', symbol, ts_open: new Date(r[0]).toISOString(), ts_close: new Date(r[6]).toISOString(),
  open: Number(r[1]), high: Number(r[2]), low: Number(r[3]), close: Number(r[4]), volume: Number(r[5])
}));
fs.writeFileSync(outFile, normalized.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log(`wrote ${normalized.length} rows to ${outFile}`);
