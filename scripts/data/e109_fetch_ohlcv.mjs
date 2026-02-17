#!/usr/bin/env node
// E109 Track A2: Guarded OHLCV Fetcher (provider-agnostic wrapper)
// ENABLE_NET=1 required for real network calls; hard-fails otherwise.
// CI truthy mode: hard-block all network calls.

import fs from 'node:fs';
import path from 'node:path';
import { isCIMode } from '../verify/foundation_ci.mjs';

const ENABLE_NET = process.env.ENABLE_NET === '1';

function enforceNetGuard() {
  if (isCIMode()) throw new Error('NETWORK_BLOCKED_IN_CI: fetch_ohlcv requires CI=false');
  if (!ENABLE_NET) throw new Error('NETWORK_BLOCKED: set ENABLE_NET=1 to enable live data fetch');
}

// Deterministic backoff: 1s, 2s, 4s (no randomness)
const RETRY_DELAYS = [1000, 2000, 4000];
const MAX_RETRIES = 3;

async function fetchWithRetry(url, opts = {}) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.json();
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      const delay = RETRY_DELAYS[attempt] || 4000;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// Bybit V5 public klines endpoint (no auth needed)
async function fetchBybitKlines(symbol, interval, startMs, endMs, limit = 200) {
  const url = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${interval}&start=${startMs}&end=${endMs}&limit=${limit}`;
  const data = await fetchWithRetry(url);
  if (data.retCode !== 0) throw new Error(`Bybit API error: ${data.retMsg}`);
  // Bybit returns newest first; reverse for chronological order
  const rows = (data.result?.list || []).reverse();
  return rows.map(r => ({
    ts_open: Number(r[0]),
    open: Number(r[1]),
    high: Number(r[2]),
    low: Number(r[3]),
    close: Number(r[4]),
    volume: Number(r[5]),
    ts_close: Number(r[0]) + intervalToMs(interval) - 1,
    symbol,
    interval
  }));
}

function intervalToMs(tf) {
  const map = { '1': 60000, '3': 180000, '5': 300000, '15': 900000, '30': 1800000,
    '60': 3600000, '120': 7200000, '240': 14400000, '360': 21600000, 'D': 86400000 };
  return map[tf] || 300000;
}

// Paginated fetch: walks forward in time, collecting all bars
async function fetchAllBars(symbol, interval, startMs, endMs) {
  enforceNetGuard();
  const tfMs = intervalToMs(interval);
  const bars = [];
  let cursor = startMs;
  const BATCH = 200;

  while (cursor < endMs) {
    const batch = await fetchBybitKlines(symbol, interval, cursor, endMs, BATCH);
    if (batch.length === 0) break;
    for (const bar of batch) {
      if (bar.ts_open >= startMs && bar.ts_open < endMs) {
        // deduplicate by ts_open
        if (bars.length === 0 || bar.ts_open > bars[bars.length - 1].ts_open) {
          bars.push(bar);
        }
      }
    }
    cursor = bars[bars.length - 1].ts_open + tfMs;
    // Rate limiting: 100ms between requests
    await new Promise(r => setTimeout(r, 100));
  }
  return bars;
}

export { fetchAllBars, fetchBybitKlines, intervalToMs, enforceNetGuard };

// CLI mode
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.url.replace('file://', ''))) {
  const symbol = process.argv[2] || 'BTCUSDT';
  const interval = process.argv[3] || '5';
  const startDate = process.argv[4] || '2024-06-01';
  const endDate = process.argv[5] || '2024-06-02';
  const startMs = new Date(startDate + 'T00:00:00Z').getTime();
  const endMs = new Date(endDate + 'T00:00:00Z').getTime();

  console.log(`Fetching ${symbol} ${interval}m from ${startDate} to ${endDate}...`);
  const bars = await fetchAllBars(symbol, interval, startMs, endMs);
  const outDir = path.resolve('data/raw');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${symbol}_${interval}m_${startDate}_${endDate}.json`);
  fs.writeFileSync(outFile, JSON.stringify({ meta: { symbol, interval, start: startDate, end: endDate, rows: bars.length, source: 'bybit_v5' }, candles: bars }, null, 2));
  console.log(`Wrote ${bars.length} bars to ${outFile}`);
}
