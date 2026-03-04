#!/usr/bin/env node
/**
 * generate_fixture_capsules.mjs — Generate locked capsules from existing fixtures
 *
 * Creates OHLCV + synthetic funding rate + synthetic OI capsules
 * from e108 fixture data for offline verification.
 *
 * These are FIXTURE-derived capsules, not real market data.
 * They satisfy the data quorum gate for offline CERT mode.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createCapsuleLock } from './capsule_lock.mjs';

const ROOT = process.cwd();
const CAPSULE_DIR = path.join(ROOT, 'artifacts', 'capsules');
fs.mkdirSync(CAPSULE_DIR, { recursive: true });

// Load e108 fixture
const fixture = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'data/fixtures/e108/e108_ohlcv_200bar.json'), 'utf8')
);
const candles = fixture.candles;

// --- Capsule 1: OHLCV from e108 fixture ---
const ohlcvLines = candles.map(c => JSON.stringify({
  ts: c.ts_open,
  open: c.open,
  high: c.high,
  low: c.low,
  close: c.close,
  volume: c.volume,
  symbol: c.symbol,
}));
const ohlcvData = ohlcvLines.join('\n') + '\n';
const ohlcvPath = path.join(CAPSULE_DIR, 'fixture_ohlcv_btcusdt_200bar.jsonl');
fs.writeFileSync(ohlcvPath, ohlcvData);

const ohlcvLock = createCapsuleLock({
  dataPath: ohlcvPath,
  lockPath: path.join(CAPSULE_DIR, 'fixture_ohlcv_btcusdt_200bar.lock.json'),
  capsule_id: 'fixture_ohlcv_btcusdt_200bar',
  source: 'e108_fixture',
  symbol: 'BTCUSDT',
  data_type: 'ohlcv',
  range_start: new Date(candles[0].ts_open).toISOString(),
  range_end: new Date(candles[candles.length - 1].ts_open).toISOString(),
  row_count: candles.length,
});
console.log(`[LOCKED] OHLCV capsule: ${ohlcvLock.row_count} rows, sha256=${ohlcvLock.sha256.slice(0, 16)}...`);

// --- Capsule 2: Synthetic funding rate ---
// Generate deterministic funding rate data from OHLCV price movement
const fundingLines = [];
for (let i = 0; i < candles.length; i += 12) { // Every 12 bars (~1h at 5m intervals)
  const c = candles[i];
  // Synthetic rate: slight positive bias with volatility-based component
  const priceChange = i > 0 ? (c.close - candles[i - 1].close) / candles[i - 1].close : 0;
  const rate = 0.0001 + priceChange * 0.1; // base rate + price-driven component
  fundingLines.push(JSON.stringify({
    ts: c.ts_open,
    symbol: 'BTCUSDT',
    funding_rate: Number(rate.toFixed(8)),
    mark_price: c.close,
  }));
}
const fundingData = fundingLines.join('\n') + '\n';
const fundingPath = path.join(CAPSULE_DIR, 'fixture_funding_btcusdt.jsonl');
fs.writeFileSync(fundingPath, fundingData);

const fundingLock = createCapsuleLock({
  dataPath: fundingPath,
  lockPath: path.join(CAPSULE_DIR, 'fixture_funding_btcusdt.lock.json'),
  capsule_id: 'fixture_funding_btcusdt',
  source: 'e108_fixture_derived',
  symbol: 'BTCUSDT',
  data_type: 'funding_rate',
  range_start: new Date(candles[0].ts_open).toISOString(),
  range_end: new Date(candles[candles.length - 1].ts_open).toISOString(),
  row_count: fundingLines.length,
});
console.log(`[LOCKED] Funding capsule: ${fundingLock.row_count} rows, sha256=${fundingLock.sha256.slice(0, 16)}...`);

// --- Capsule 3: Synthetic open interest ---
const oiLines = [];
let cumulativeOI = 50000; // Start with 50k BTC OI
for (let i = 0; i < candles.length; i += 6) { // Every 6 bars (~30m)
  const c = candles[i];
  // OI follows volume trend
  const volumeRatio = c.volume / 100;
  cumulativeOI = cumulativeOI + (volumeRatio - 1) * 100;
  if (cumulativeOI < 10000) cumulativeOI = 10000;

  oiLines.push(JSON.stringify({
    ts: c.ts_open,
    symbol: 'BTCUSDT',
    sum_open_interest: Number(cumulativeOI.toFixed(2)),
    sum_open_interest_value: Number((cumulativeOI * c.close).toFixed(2)),
  }));
}
const oiData = oiLines.join('\n') + '\n';
const oiPath = path.join(CAPSULE_DIR, 'fixture_oi_btcusdt.jsonl');
fs.writeFileSync(oiPath, oiData);

const oiLock = createCapsuleLock({
  dataPath: oiPath,
  lockPath: path.join(CAPSULE_DIR, 'fixture_oi_btcusdt.lock.json'),
  capsule_id: 'fixture_oi_btcusdt',
  source: 'e108_fixture_derived',
  symbol: 'BTCUSDT',
  data_type: 'open_interest',
  range_start: new Date(candles[0].ts_open).toISOString(),
  range_end: new Date(candles[candles.length - 1].ts_open).toISOString(),
  row_count: oiLines.length,
});
console.log(`[LOCKED] OI capsule: ${oiLock.row_count} rows, sha256=${oiLock.sha256.slice(0, 16)}...`);

console.log(`\n[DONE] 3 capsules generated in ${path.relative(ROOT, CAPSULE_DIR)}`);
