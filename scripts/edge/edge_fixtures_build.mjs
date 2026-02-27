/**
 * edge_fixtures_build.mjs — Golden Lock Pack builder (P2.2)
 *
 * Writes deterministic CI fixtures under artifacts/fixtures/ (NOT incoming).
 * This directory IS committed — it's the stable offline dataset for CI.
 *
 * Fixtures produced:
 *   artifacts/fixtures/liq/bybit_ws_v5/v2/raw.jsonl     — 20 liquidation rows, ~60s window
 *   artifacts/fixtures/liq/bybit_ws_v5/v2/lock.json     — SHA + schema contract
 *   artifacts/fixtures/price/offline/v1/raw.jsonl        — 6 BTCUSDT bars (1-min each)
 *   artifacts/fixtures/price/offline/v1/lock.json        — SHA + schema contract
 *
 * Liq fixture: 20 rows, 3 symbols, mixed liq_side, ~60s window
 *   BTCUSDT: 10 rows (6 SHORT liq + 4 LONG liq)
 *   ETHUSDT: 6 rows (3 SHORT liq + 3 LONG liq)
 *   SOLUSDT: 4 rows (1 SHORT liq + 3 LONG liq)
 *
 * Price fixture: 6 BTCUSDT bars + 3 ETHUSDT bars + 3 SOLUSDT bars (1-min)
 *
 * These fixtures allow CI to run the full signals+paper pipeline without network.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const canon = (v) => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object'
  ? Object.keys(v).sort((a, b) => a.localeCompare(b)).reduce((o, k) => (o[k] = canon(v[k]), o), {})
  : v;

// ── Liquidation fixture ───────────────────────────────────────────────────────
const LIQ_PROVIDER = 'bybit_ws_v5';
const LIQ_SCHEMA = 'liquidations.bybit_ws_v5.v2';
const LIQ_RUN_ID = 'GOLDEN_V1';
const BASE_TS = 1735689600000; // 2025-01-01T00:00:00Z

const liqRows = [
  // BTCUSDT — 6 SHORT (Sell) + 4 LONG (Buy) => long_vol=400, short_vol=600, liq_pressure=0.4 => NEUTRAL
  { provider_id: LIQ_PROVIDER, symbol: 'BTCUSDT', side: 'Sell', liq_side: 'SHORT', ts: BASE_TS + 0,    p: '43000', v: '100', topic: 'allLiquidation.BTCUSDT' },
  { provider_id: LIQ_PROVIDER, symbol: 'BTCUSDT', side: 'Buy',  liq_side: 'LONG',  ts: BASE_TS + 2000, p: '43020', v: '80',  topic: 'allLiquidation.BTCUSDT' },
  { provider_id: LIQ_PROVIDER, symbol: 'BTCUSDT', side: 'Sell', liq_side: 'SHORT', ts: BASE_TS + 5000, p: '43010', v: '120', topic: 'allLiquidation.BTCUSDT' },
  { provider_id: LIQ_PROVIDER, symbol: 'BTCUSDT', side: 'Buy',  liq_side: 'LONG',  ts: BASE_TS + 8000, p: '43050', v: '90',  topic: 'allLiquidation.BTCUSDT' },
  { provider_id: LIQ_PROVIDER, symbol: 'BTCUSDT', side: 'Sell', liq_side: 'SHORT', ts: BASE_TS + 12000, p: '43030', v: '110', topic: 'allLiquidation.BTCUSDT' },
  { provider_id: LIQ_PROVIDER, symbol: 'BTCUSDT', side: 'Sell', liq_side: 'SHORT', ts: BASE_TS + 15000, p: '43040', v: '90',  topic: 'allLiquidation.BTCUSDT' },
  { provider_id: LIQ_PROVIDER, symbol: 'BTCUSDT', side: 'Buy',  liq_side: 'LONG',  ts: BASE_TS + 18000, p: '43060', v: '130', topic: 'allLiquidation.BTCUSDT' },
  { provider_id: LIQ_PROVIDER, symbol: 'BTCUSDT', side: 'Sell', liq_side: 'SHORT', ts: BASE_TS + 22000, p: '43070', v: '80',  topic: 'allLiquidation.BTCUSDT' },
  { provider_id: LIQ_PROVIDER, symbol: 'BTCUSDT', side: 'Sell', liq_side: 'SHORT', ts: BASE_TS + 28000, p: '43080', v: '70',  topic: 'allLiquidation.BTCUSDT' },
  { provider_id: LIQ_PROVIDER, symbol: 'BTCUSDT', side: 'Buy',  liq_side: 'LONG',  ts: BASE_TS + 35000, p: '43090', v: '100', topic: 'allLiquidation.BTCUSDT' },

  // ETHUSDT — 3 SHORT + 3 LONG = even => liq_pressure=0.5 => NEUTRAL
  { provider_id: LIQ_PROVIDER, symbol: 'ETHUSDT', side: 'Sell', liq_side: 'SHORT', ts: BASE_TS + 1000,  p: '2400', v: '50',  topic: 'allLiquidation.ETHUSDT' },
  { provider_id: LIQ_PROVIDER, symbol: 'ETHUSDT', side: 'Buy',  liq_side: 'LONG',  ts: BASE_TS + 6000,  p: '2410', v: '50',  topic: 'allLiquidation.ETHUSDT' },
  { provider_id: LIQ_PROVIDER, symbol: 'ETHUSDT', side: 'Sell', liq_side: 'SHORT', ts: BASE_TS + 14000, p: '2405', v: '60',  topic: 'allLiquidation.ETHUSDT' },
  { provider_id: LIQ_PROVIDER, symbol: 'ETHUSDT', side: 'Buy',  liq_side: 'LONG',  ts: BASE_TS + 20000, p: '2415', v: '60',  topic: 'allLiquidation.ETHUSDT' },
  { provider_id: LIQ_PROVIDER, symbol: 'ETHUSDT', side: 'Sell', liq_side: 'SHORT', ts: BASE_TS + 25000, p: '2420', v: '40',  topic: 'allLiquidation.ETHUSDT' },
  { provider_id: LIQ_PROVIDER, symbol: 'ETHUSDT', side: 'Buy',  liq_side: 'LONG',  ts: BASE_TS + 40000, p: '2425', v: '40',  topic: 'allLiquidation.ETHUSDT' },

  // SOLUSDT — 1 SHORT + 3 LONG => long_vol=300, short_vol=50, liq_pressure=0.857 => BEAR_LIQ
  { provider_id: LIQ_PROVIDER, symbol: 'SOLUSDT', side: 'Sell', liq_side: 'SHORT', ts: BASE_TS + 3000,  p: '180', v: '50',  topic: 'allLiquidation.SOLUSDT' },
  { provider_id: LIQ_PROVIDER, symbol: 'SOLUSDT', side: 'Buy',  liq_side: 'LONG',  ts: BASE_TS + 9000,  p: '182', v: '100', topic: 'allLiquidation.SOLUSDT' },
  { provider_id: LIQ_PROVIDER, symbol: 'SOLUSDT', side: 'Buy',  liq_side: 'LONG',  ts: BASE_TS + 17000, p: '181', v: '100', topic: 'allLiquidation.SOLUSDT' },
  { provider_id: LIQ_PROVIDER, symbol: 'SOLUSDT', side: 'Buy',  liq_side: 'LONG',  ts: BASE_TS + 30000, p: '183', v: '100', topic: 'allLiquidation.SOLUSDT' },
];

const liqRawContent = liqRows.map((r) => JSON.stringify(r)).join('\n') + '\n';
const liqNormRows = liqRows.map((r) => ({
  provider_id: r.provider_id, symbol: r.symbol, side: r.side,
  ts: Number(r.ts), p: String(r.p), v: String(r.v), topic: r.topic || '',
}));
const liqNormalized = { provider_id: LIQ_PROVIDER, schema_version: LIQ_SCHEMA, time_unit_sentinel: 'ms', rows: liqNormRows };

const liqOutDir = path.join(ROOT, 'artifacts/fixtures/liq', LIQ_PROVIDER, 'v2');
fs.mkdirSync(liqOutDir, { recursive: true });
fs.writeFileSync(path.join(liqOutDir, 'raw.jsonl'), liqRawContent);
writeJsonDeterministic(path.join(liqOutDir, 'lock.json'), {
  provider_id: LIQ_PROVIDER,
  schema_version: LIQ_SCHEMA,
  time_unit_sentinel: 'ms',
  run_id: LIQ_RUN_ID,
  rows_n: liqRows.length,
  symbols: [...new Set(liqRows.map((r) => r.symbol))].sort(),
  raw_capture_sha256: sha(liqRawContent),
  normalized_schema_sha256: sha(JSON.stringify(canon(liqNormalized))),
  captured_at_utc: 'FIXTURE',
});

// ── Price bar fixture ─────────────────────────────────────────────────────────
const PRICE_PROVIDER = 'offline_fixture';
const PRICE_SCHEMA = 'price_bars.offline_fixture.v1';
const PRICE_RUN_ID = 'GOLDEN_V1';
const BAR_MS = 60_000;

const priceBars = [
  // BTCUSDT: 6 bars, bull trend
  { provider_id: PRICE_PROVIDER, symbol: 'BTCUSDT', bar_ts_ms: BASE_TS + 0 * BAR_MS, open: 43000, high: 43150, low: 42950, close: 43100, volume: 120, bar_ms: BAR_MS },
  { provider_id: PRICE_PROVIDER, symbol: 'BTCUSDT', bar_ts_ms: BASE_TS + 1 * BAR_MS, open: 43100, high: 43300, low: 43050, close: 43250, volume: 150, bar_ms: BAR_MS },
  { provider_id: PRICE_PROVIDER, symbol: 'BTCUSDT', bar_ts_ms: BASE_TS + 2 * BAR_MS, open: 43250, high: 43400, low: 43200, close: 43350, volume: 130, bar_ms: BAR_MS },
  { provider_id: PRICE_PROVIDER, symbol: 'BTCUSDT', bar_ts_ms: BASE_TS + 3 * BAR_MS, open: 43350, high: 43600, low: 43300, close: 43500, volume: 200, bar_ms: BAR_MS },
  { provider_id: PRICE_PROVIDER, symbol: 'BTCUSDT', bar_ts_ms: BASE_TS + 4 * BAR_MS, open: 43500, high: 43550, low: 43350, close: 43400, volume: 80,  bar_ms: BAR_MS },
  { provider_id: PRICE_PROVIDER, symbol: 'BTCUSDT', bar_ts_ms: BASE_TS + 5 * BAR_MS, open: 43400, high: 43450, low: 43300, close: 43350, volume: 70,  bar_ms: BAR_MS },
  // ETHUSDT: 4 bars
  { provider_id: PRICE_PROVIDER, symbol: 'ETHUSDT', bar_ts_ms: BASE_TS + 0 * BAR_MS, open: 2400, high: 2430, low: 2390, close: 2420, volume: 300, bar_ms: BAR_MS },
  { provider_id: PRICE_PROVIDER, symbol: 'ETHUSDT', bar_ts_ms: BASE_TS + 1 * BAR_MS, open: 2420, high: 2450, low: 2410, close: 2440, volume: 280, bar_ms: BAR_MS },
  { provider_id: PRICE_PROVIDER, symbol: 'ETHUSDT', bar_ts_ms: BASE_TS + 2 * BAR_MS, open: 2440, high: 2460, low: 2420, close: 2430, volume: 260, bar_ms: BAR_MS },
  { provider_id: PRICE_PROVIDER, symbol: 'ETHUSDT', bar_ts_ms: BASE_TS + 3 * BAR_MS, open: 2430, high: 2440, low: 2400, close: 2410, volume: 220, bar_ms: BAR_MS },
  // SOLUSDT: 4 bars
  { provider_id: PRICE_PROVIDER, symbol: 'SOLUSDT', bar_ts_ms: BASE_TS + 0 * BAR_MS, open: 180, high: 184, low: 179, close: 183, volume: 1000, bar_ms: BAR_MS },
  { provider_id: PRICE_PROVIDER, symbol: 'SOLUSDT', bar_ts_ms: BASE_TS + 1 * BAR_MS, open: 183, high: 186, low: 181, close: 185, volume: 900,  bar_ms: BAR_MS },
  { provider_id: PRICE_PROVIDER, symbol: 'SOLUSDT', bar_ts_ms: BASE_TS + 2 * BAR_MS, open: 185, high: 188, low: 183, close: 186, volume: 1100, bar_ms: BAR_MS },
  { provider_id: PRICE_PROVIDER, symbol: 'SOLUSDT', bar_ts_ms: BASE_TS + 3 * BAR_MS, open: 186, high: 190, low: 184, close: 189, volume: 1200, bar_ms: BAR_MS },
];

const priceRawContent = priceBars.map((r) => JSON.stringify(r)).join('\n') + '\n';
const priceNormRows = priceBars.map((r) => ({
  bar_ms: r.bar_ms, bar_ts_ms: r.bar_ts_ms, close: r.close,
  high: r.high, low: r.low, open: r.open,
  provider_id: r.provider_id, symbol: r.symbol, volume: r.volume,
}));
const priceNormalized = { provider_id: PRICE_PROVIDER, schema_version: PRICE_SCHEMA, rows: priceNormRows };

const priceOutDir = path.join(ROOT, 'artifacts/fixtures/price', PRICE_PROVIDER, 'v1');
fs.mkdirSync(priceOutDir, { recursive: true });
fs.writeFileSync(path.join(priceOutDir, 'raw.jsonl'), priceRawContent);
writeJsonDeterministic(path.join(priceOutDir, 'lock.json'), {
  provider_id: PRICE_PROVIDER,
  schema_version: PRICE_SCHEMA,
  run_id: PRICE_RUN_ID,
  bar_ms: BAR_MS,
  rows_n: priceBars.length,
  symbols: [...new Set(priceBars.map((b) => b.symbol))].sort(),
  raw_sha256: sha(priceRawContent),
  normalized_sha256: sha(JSON.stringify(canon(priceNormalized))),
  captured_at_utc: 'FIXTURE',
});

console.log(`[PASS] edge_fixtures_build`);
console.log(`  liq: ${liqRows.length} rows, symbols=${[...new Set(liqRows.map(r=>r.symbol))].sort().join(',')}`);
console.log(`  price: ${priceBars.length} bars, symbols=${[...new Set(priceBars.map(b=>b.symbol))].sort().join(',')}`);
console.log(`  liq_out:   ${liqOutDir}`);
console.log(`  price_out: ${priceOutDir}`);
