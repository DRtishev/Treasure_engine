/**
 * regression_fix02_replay_pass.mjs — RG_FIX02
 *
 * Verifies that the golden fixtures pass offline replay validation
 * (SHA + schema + row count integrity) under TREASURE_NET_KILL=1.
 *
 * Tests:
 *   - liq fixture: raw.jsonl SHA matches lock.raw_capture_sha256
 *   - liq fixture: normalized_schema_sha256 matches computed value
 *   - price fixture: raw.jsonl SHA matches lock.raw_sha256
 *   - price fixture: normalized_sha256 matches computed value
 *   - All rows have required fields
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

if (process.env.TREASURE_NET_KILL !== '1') {
  console.error('[FAIL] ND_FIX02 TREASURE_NET_KILL must be 1');
  process.exit(1);
}

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const canon = (v) => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object'
  ? Object.keys(v).sort((a, b) => a.localeCompare(b)).reduce((o, k) => (o[k] = canon(v[k]), o), {})
  : v;

const LIQ_DIR = path.join(ROOT, 'artifacts/fixtures/liq/bybit_ws_v5/v2');
const PRICE_DIR = path.join(ROOT, 'artifacts/fixtures/price/offline_fixture/v1');

const fails = [];
const results = {};

// ── Liq fixture replay ────────────────────────────────────────────────────────
const liqRawPath = path.join(LIQ_DIR, 'raw.jsonl');
const liqLockPath = path.join(LIQ_DIR, 'lock.json');

if (!fs.existsSync(liqRawPath)) { fails.push('LIQ_RAW_MISSING'); }
else if (!fs.existsSync(liqLockPath)) { fails.push('LIQ_LOCK_MISSING'); }
else {
  const liqRaw = fs.readFileSync(liqRawPath, 'utf8');
  const liqLock = JSON.parse(fs.readFileSync(liqLockPath, 'utf8'));

  const rawSha = sha(liqRaw);
  if (rawSha !== liqLock.raw_capture_sha256)
    fails.push(`LIQ_RAW_SHA_MISMATCH: expected=${liqLock.raw_capture_sha256.slice(0,16)} actual=${rawSha.slice(0,16)}`);

  const rows = liqRaw.split('\n').filter(Boolean).map(JSON.parse);
  if (rows.length !== liqLock.rows_n)
    fails.push(`LIQ_ROWS_N: expected=${liqLock.rows_n} actual=${rows.length}`);

  for (const r of rows) {
    if (!r.provider_id || !r.symbol || !r.side || !r.liq_side || !r.ts || !r.topic)
      fails.push(`LIQ_ROW_MISSING_FIELDS: ${JSON.stringify(r).slice(0, 80)}`);
    if (!['LONG', 'SHORT'].includes(r.liq_side))
      fails.push(`LIQ_ROW_LIQ_SIDE_INVALID: ${r.liq_side}`);
  }

  const normRows = rows.map((r) => ({
    provider_id: r.provider_id, symbol: r.symbol, side: r.side,
    ts: Number(r.ts), p: String(r.p), v: String(r.v), topic: r.topic || '',
  }));
  const normalized = { provider_id: liqLock.provider_id, schema_version: liqLock.schema_version, time_unit_sentinel: 'ms', rows: normRows };
  const normSha = sha(JSON.stringify(canon(normalized)));
  if (normSha !== liqLock.normalized_schema_sha256)
    fails.push(`LIQ_NORM_SHA_MISMATCH: expected=${liqLock.normalized_schema_sha256.slice(0,16)} actual=${normSha.slice(0,16)}`);

  results.liq = { rows_n: rows.length, raw_sha_ok: rawSha === liqLock.raw_capture_sha256, norm_sha_ok: normSha === liqLock.normalized_schema_sha256 };
}

// ── Price fixture replay ──────────────────────────────────────────────────────
const priceRawPath = path.join(PRICE_DIR, 'raw.jsonl');
const priceLockPath = path.join(PRICE_DIR, 'lock.json');

if (!fs.existsSync(priceRawPath)) { fails.push('PRICE_RAW_MISSING'); }
else if (!fs.existsSync(priceLockPath)) { fails.push('PRICE_LOCK_MISSING'); }
else {
  const priceRaw = fs.readFileSync(priceRawPath, 'utf8');
  const priceLock = JSON.parse(fs.readFileSync(priceLockPath, 'utf8'));

  const rawSha = sha(priceRaw);
  if (rawSha !== priceLock.raw_sha256)
    fails.push(`PRICE_RAW_SHA_MISMATCH: expected=${priceLock.raw_sha256.slice(0,16)} actual=${rawSha.slice(0,16)}`);

  const bars = priceRaw.split('\n').filter(Boolean).map(JSON.parse);
  if (bars.length !== priceLock.rows_n)
    fails.push(`PRICE_ROWS_N: expected=${priceLock.rows_n} actual=${bars.length}`);

  for (const b of bars) {
    if (!Number.isFinite(b.open) || !Number.isFinite(b.close) || !Number.isFinite(b.high) || !Number.isFinite(b.low))
      fails.push(`PRICE_BAR_OHLC_INVALID at bar_ts=${b.bar_ts_ms}`);
    if (b.high < b.low) fails.push(`PRICE_BAR_HIGH_LT_LOW at bar_ts=${b.bar_ts_ms}`);
  }

  const normRows = bars.map((r) => ({
    bar_ms: r.bar_ms, bar_ts_ms: r.bar_ts_ms, close: r.close,
    high: r.high, low: r.low, open: r.open, provider_id: r.provider_id, symbol: r.symbol, volume: r.volume,
  }));
  const normalized = { provider_id: priceLock.provider_id, schema_version: priceLock.schema_version, rows: normRows };
  const normSha = sha(JSON.stringify(canon(normalized)));
  if (normSha !== priceLock.normalized_sha256)
    fails.push(`PRICE_NORM_SHA_MISMATCH: expected=${priceLock.normalized_sha256.slice(0,16)} actual=${normSha.slice(0,16)}`);

  results.price = { rows_n: bars.length, raw_sha_ok: rawSha === priceLock.raw_sha256, norm_sha_ok: normSha === priceLock.normalized_sha256 };
}

const ok = fails.length === 0;
const status = ok ? 'PASS' : 'FAIL';
const reason = ok ? 'NONE' : 'RG_FIX02';

writeMd(path.join(EXEC, 'REGRESSION_FIX02_REPLAY_PASS.md'),
  `# REGRESSION_FIX02_REPLAY_PASS.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:regression:fix02-replay-pass\n\n## Results\n\n- liq: rows=${results.liq?.rows_n} raw_sha_ok=${results.liq?.raw_sha_ok} norm_sha_ok=${results.liq?.norm_sha_ok}\n- price: rows=${results.price?.rows_n} raw_sha_ok=${results.price?.raw_sha_ok} norm_sha_ok=${results.price?.norm_sha_ok}\n\n${fails.map(f => `- FAIL: ${f}`).join('\n') || '- checks: ALL_PASS'}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_fix02_replay_pass.json'), {
  schema_version: '1.0.0', status, reason_code: reason, run_id: RUN_ID, results, fails,
});

console.log(`[${status}] regression_fix02_replay_pass — ${reason}`);
if (!ok) fails.forEach(f => console.error(`  ${f}`));
process.exit(ok ? 0 : 1);
