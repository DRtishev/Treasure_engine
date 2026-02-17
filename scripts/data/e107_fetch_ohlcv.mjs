#!/usr/bin/env node
// E107 Track 1: Fetch OHLCV data from exchange(s)
// REQUIRES: ENABLE_NET=1 (never runs in tests/verify)

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ENABLE_NET = process.env.ENABLE_NET === '1';
if (!ENABLE_NET) {
  console.error('e107_fetch_ohlcv: ENABLE_NET=1 required for network access');
  process.exit(1);
}

const RAW_DIR = path.resolve('data/raw/private');
const SYMBOL = process.env.E107_SYMBOL || 'BTCUSDT';
const TIMEFRAME = process.env.E107_TIMEFRAME || '5m';
const LIMIT = parseInt(process.env.E107_LIMIT || '500', 10);

async function fetchBinanceOHLCV(symbol, interval, limit) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Binance API error: ${resp.status} ${resp.statusText}`);
  const raw = await resp.json();

  return raw.map(k => ({
    ts_open: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
    ts_close: k[6],
    symbol,
    interval
  }));
}

async function main() {
  console.log(`e107_fetch_ohlcv: Fetching ${SYMBOL} ${TIMEFRAME} x${LIMIT}...`);

  const candles = await fetchBinanceOHLCV(SYMBOL, TIMEFRAME, LIMIT);

  const outDir = path.join(RAW_DIR, 'e107');
  fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, `${SYMBOL}_${TIMEFRAME}_${Date.now()}.json`);
  const content = JSON.stringify({ meta: { symbol: SYMBOL, timeframe: TIMEFRAME, rows: candles.length, fetched_at: new Date().toISOString(), source: 'binance' }, candles }, null, 2);

  fs.writeFileSync(outPath, content, 'utf8');

  const hash = crypto.createHash('sha256').update(content).digest('hex');
  console.log(`e107_fetch_ohlcv: Wrote ${candles.length} candles to ${outPath}`);
  console.log(`e107_fetch_ohlcv: SHA256=${hash}`);

  // Write manifest
  const manifest = [
    '# DATA_CAPSULE_MANIFEST',
    `- symbol: ${SYMBOL}`,
    `- timeframe: ${TIMEFRAME}`,
    `- rows: ${candles.length}`,
    `- from: ${candles.length > 0 ? new Date(candles[0].ts_open).toISOString() : 'N/A'}`,
    `- to: ${candles.length > 0 ? new Date(candles[candles.length - 1].ts_close).toISOString() : 'N/A'}`,
    `- file: ${path.basename(outPath)}`,
    `- sha256: ${hash}`,
    `- fetched_at: ${new Date().toISOString()}`
  ].join('\n');

  fs.writeFileSync(path.join(outDir, 'DATA_CAPSULE_MANIFEST.md'), manifest, 'utf8');
  console.log('e107_fetch_ohlcv: Manifest written');
}

main().catch(err => {
  console.error(`e107_fetch_ohlcv FAILED: ${err.message}`);
  process.exit(1);
});
