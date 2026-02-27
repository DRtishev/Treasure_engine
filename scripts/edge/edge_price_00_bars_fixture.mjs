/**
 * edge_price_00_bars_fixture.mjs — Price Bars Fixture
 *
 * Writes a deterministic OHLCV bar fixture for offline development and regressions.
 * Format mirrors what a real price-bar acquire would write:
 *   artifacts/incoming/price_bars/<provider>/<run_id>/raw.jsonl  — one bar per line
 *   artifacts/incoming/price_bars/<provider>/<run_id>/lock.json  — schema + sha256
 *
 * Schema: price_bars.offline_fixture.v1
 * Fixture: 5 BTCUSDT 1-min bars, 2 ETHUSDT 1-min bars (1735689600000 epoch, 60s window)
 *
 * Fields per bar:
 *   provider_id, symbol, bar_ts_ms, open, high, low, close, volume, bar_ms
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const PROVIDER_ID = 'offline_fixture';
const SCHEMA_VERSION = 'price_bars.offline_fixture.v1';
const RUN_ID = 'RG_PRICE01_FIXTURE';
const BASE_TS = 1735689600000; // 2025-01-01T00:00:00Z
const BAR_MS = 60_000;

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const canon = (v) => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object'
  ? Object.keys(v).sort((a, b) => a.localeCompare(b)).reduce((o, k) => (o[k] = canon(v[k]), o), {})
  : v;

// Fixture bars: 5 BTCUSDT bars + 2 ETHUSDT bars
const fixtureBars = [
  // BTCUSDT: ascending trend, volume spike on bar 4
  { provider_id: PROVIDER_ID, symbol: 'BTCUSDT', bar_ts_ms: BASE_TS + 0 * BAR_MS, open: 43000, high: 43120, low: 42980, close: 43100, volume: 50, bar_ms: BAR_MS },
  { provider_id: PROVIDER_ID, symbol: 'BTCUSDT', bar_ts_ms: BASE_TS + 1 * BAR_MS, open: 43100, high: 43200, low: 43050, close: 43180, volume: 60, bar_ms: BAR_MS },
  { provider_id: PROVIDER_ID, symbol: 'BTCUSDT', bar_ts_ms: BASE_TS + 2 * BAR_MS, open: 43180, high: 43300, low: 43150, close: 43250, volume: 55, bar_ms: BAR_MS },
  { provider_id: PROVIDER_ID, symbol: 'BTCUSDT', bar_ts_ms: BASE_TS + 3 * BAR_MS, open: 43250, high: 43500, low: 43200, close: 43450, volume: 140, bar_ms: BAR_MS },
  { provider_id: PROVIDER_ID, symbol: 'BTCUSDT', bar_ts_ms: BASE_TS + 4 * BAR_MS, open: 43450, high: 43480, low: 43380, close: 43400, volume: 45, bar_ms: BAR_MS },
  // ETHUSDT: 2 bars, slight decline
  { provider_id: PROVIDER_ID, symbol: 'ETHUSDT', bar_ts_ms: BASE_TS + 0 * BAR_MS, open: 2400, high: 2420, low: 2390, close: 2410, volume: 200, bar_ms: BAR_MS },
  { provider_id: PROVIDER_ID, symbol: 'ETHUSDT', bar_ts_ms: BASE_TS + 1 * BAR_MS, open: 2410, high: 2415, low: 2380, close: 2385, volume: 180, bar_ms: BAR_MS },
];

const ROOT = process.cwd();
const outDir = path.join(ROOT, 'artifacts/incoming/price_bars', PROVIDER_ID, RUN_ID);
fs.mkdirSync(outDir, { recursive: true });

const rawLines = fixtureBars.map((r) => JSON.stringify(r)).join('\n') + '\n';
const normalizedRows = fixtureBars.map((r) => ({
  bar_ms: r.bar_ms, bar_ts_ms: r.bar_ts_ms, close: r.close,
  high: r.high, low: r.low, open: r.open,
  provider_id: r.provider_id, symbol: r.symbol, volume: r.volume,
}));
const normalized = { provider_id: PROVIDER_ID, schema_version: SCHEMA_VERSION, rows: normalizedRows };

fs.writeFileSync(path.join(outDir, 'raw.jsonl'), rawLines);
writeJsonDeterministic(path.join(outDir, 'lock.json'), {
  provider_id: PROVIDER_ID,
  schema_version: SCHEMA_VERSION,
  run_id: RUN_ID,
  bar_ms: BAR_MS,
  rows_n: fixtureBars.length,
  symbols: [...new Set(fixtureBars.map((b) => b.symbol))].sort(),
  raw_sha256: sha(rawLines),
  normalized_sha256: sha(JSON.stringify(canon(normalized))),
  captured_at_utc: 'FIXTURE',
});

console.log(`[PASS] edge_price_00_bars_fixture run_id=${RUN_ID} rows=${fixtureBars.length}`);
console.log(`  raw_sha256: ${sha(rawLines).slice(0, 16)}...`);
console.log(`  outDir: ${outDir}`);
