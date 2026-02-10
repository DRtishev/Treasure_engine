#!/usr/bin/env node
// scripts/data/import_binance_klines_json.mjs
// Convert Binance klines JSON (array-of-arrays) to Treasure Engine dataset JSON.
// Each kline: [ openTime, open, high, low, close, volume, closeTime, quoteVolume, ... ]

import fs from 'fs';

function die(msg) {
  console.error('[import:binance] ' + msg);
  process.exit(1);
}

function coerceArray(obj) {
  if (Array.isArray(obj)) return obj;
  if (obj && Array.isArray(obj.data)) return obj.data;
  if (obj && Array.isArray(obj.klines)) return obj.klines;
  return null;
}

function main() {
  const args = process.argv.slice(2);
  const inPath = args[0];
  const outPath = args[1] || 'data/real_binance_ohlcv.json';
  const symbol = args[2] || 'UNKNOWN';
  const timeframe = args[3] || 'UNKNOWN';

  if (!inPath) {
    console.log('Usage: node scripts/data/import_binance_klines_json.mjs <in.json> <out.json> [symbol] [timeframe]');
    process.exit(1);
  }
  if (!fs.existsSync(inPath)) die('Input not found: ' + inPath);

  const rawText = fs.readFileSync(inPath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    die('Invalid JSON: ' + e.message);
  }

  const arr = coerceArray(parsed);
  if (!arr) die('Could not find klines array. Expected JSON array or {data:[...]} or {klines:[...]}.');
  if (arr.length === 0) die('Empty klines array');

  const bars = [];
  for (let i = 0; i < arr.length; i++) {
    const k = arr[i];
    if (!Array.isArray(k) || k.length < 6) continue;
    const t_ms = Number(k[0]);
    const o = Number(k[1]);
    const h = Number(k[2]);
    const l = Number(k[3]);
    const c = Number(k[4]);
    const v = Number(k[5]);
    if (!Number.isFinite(t_ms) || !Number.isFinite(o) || !Number.isFinite(h) || !Number.isFinite(l) || !Number.isFinite(c) || !Number.isFinite(v)) continue;
    bars.push({ t_ms, o, h, l, c, v });
  }

  if (bars.length < 50) die('Too few valid bars parsed: ' + bars.length);

  const dataset = {
    meta: {
      source: 'REAL',
      provider: 'BINANCE',
      symbol,
      timeframe,
      disclaimer: 'REAL DATA: Imported from Binance klines JSON by scripts/data/import_binance_klines_json.mjs. Validate fees, latency, and orderbook behavior separately.',
      seed: 0
    },
    bars
  };

  fs.writeFileSync(outPath, JSON.stringify(dataset, null, 2));
  console.log('[import:binance] WROTE:', outPath, 'bars=' + bars.length);
}

main();
