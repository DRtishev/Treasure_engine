#!/usr/bin/env node
// E108 Extended OHLCV fixture: 200 bars of BTCUSDT 5m
// Deterministic sine-wave + trend + noise pattern for backtest/WFO
// NO network, pure math generation

import fs from 'node:fs';
import path from 'node:path';

const BARS = 200;
const SYMBOL = 'BTCUSDT';
const INTERVAL = '5m';
const BASE_PRICE = 42000;
const START_TS = 1704067200000; // 2024-01-01T00:00:00Z
const BAR_MS = 5 * 60 * 1000;

function seededRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const rng = seededRng(42108);
const candles = [];

let price = BASE_PRICE;
for (let i = 0; i < BARS; i++) {
  const trend = Math.sin(i * 0.03) * 200 + (i * 0.5);
  const noise = (rng() - 0.5) * 100;
  const open = price;
  const move = trend * 0.01 + noise;
  const high = open + Math.abs(move) + rng() * 50;
  const low = open - Math.abs(move) - rng() * 50;
  const close = open + move;
  const volume = 50 + rng() * 200;

  candles.push({
    ts_open: START_TS + i * BAR_MS,
    open: Math.round(open * 100) / 100,
    high: Math.round(Math.max(open, close, high) * 100) / 100,
    low: Math.round(Math.min(open, close, low) * 100) / 100,
    close: Math.round(close * 100) / 100,
    volume: Math.round(volume * 10) / 10,
    ts_close: START_TS + (i + 1) * BAR_MS - 1,
    symbol: SYMBOL,
    interval: INTERVAL
  });
  price = close;
}

const data = {
  meta: { symbol: SYMBOL, timeframe: INTERVAL, rows: BARS, source: 'FIXTURE_GENERATED', seed: 42108 },
  candles
};

const outDir = path.resolve('data/fixtures/e108');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'e108_ohlcv_200bar.json'), JSON.stringify(data, null, 2), 'utf8');
console.log(`Generated ${BARS} bars to data/fixtures/e108/e108_ohlcv_200bar.json`);
