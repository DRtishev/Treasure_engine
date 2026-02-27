/**
 * edge_liq_02_signals.mjs — P2 MVP Signals Pipeline
 *
 * Reads validated liquidation replay data and computes per-bar signal features:
 *   - liq_pressure: sell_vol / (sell_vol + buy_vol) [0..1]
 *   - burst_score:  bar_total_vol / rolling_mean_vol [≥0, 1.0=baseline]
 *   - regime_flag:  BEAR_LIQ | BULL_LIQ | NEUTRAL (+ _BURST suffix)
 *
 * Outputs:
 *   artifacts/outgoing/features_liq.jsonl  — one JSON line per (symbol, bar)
 *   artifacts/outgoing/features_liq.lock.json — schema + SHA256 of jsonl
 *
 * Constraints:
 *   - TREASURE_NET_KILL=1 required (offline-authoritative)
 *   - Fixed seed / no wall-clock truth (deterministic x2)
 *   - Reads latest run_id from artifacts/incoming/liquidations/<provider>/
 *
 * Usage:
 *   TREASURE_NET_KILL=1 node scripts/edge/edge_liq_02_signals.mjs [--provider bybit_ws_v5] [--run-id <id>] [--window-ms 60000]
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PROVIDERS = {
  bybit_ws_v5: { schema: 'liquidations.bybit_ws_v5.v1', dir: 'bybit_ws_v5' },
  okx_ws_v5: { schema: 'liquidations.okx_ws_v5.v1', dir: 'okx_ws_v5' },
  binance_forceorder_ws: { schema: 'liquidations.binance_forceorder_ws.v1', dir: 'binance_forceorder_ws' },
};

const FEATURES_SCHEMA_VERSION = 'signals.liq.v1';
const DEFAULT_WINDOW_MS = 60000;
const BURST_THRESHOLD = 2.0;
const BEAR_LIQ_THRESHOLD = 0.65;
const BULL_LIQ_THRESHOLD = 0.35;
const ROLLING_WINDOW_BARS = 5;

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const canon = (v) => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object'
  ? Object.keys(v).sort((a, b) => a.localeCompare(b)).reduce((o, k) => (o[k] = canon(v[k]), o), {})
  : v;

function parseArgs(argv) {
  const args = { provider: 'bybit_ws_v5', runId: '', windowMs: DEFAULT_WINDOW_MS };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--provider') args.provider = argv[++i] || args.provider;
    else if (a === '--run-id') args.runId = argv[++i] || '';
    else if (a === '--window-ms') args.windowMs = Number(argv[++i]) || DEFAULT_WINDOW_MS;
  }
  return args;
}

function fail(code, msg) {
  console.error(`[FAIL] ${code} ${msg}`);
  process.exit(1);
}

// ── Guards ────────────────────────────────────────────────────────────────────
if (process.env.TREASURE_NET_KILL !== '1') fail('ND_SIG01', 'TREASURE_NET_KILL must be 1 for offline signal computation');

const args = parseArgs(process.argv.slice(2));
const cfg = PROVIDERS[args.provider];
if (!cfg) fail('SIG_SCH01', `unknown provider=${args.provider}`);

// ── Locate raw/lock ───────────────────────────────────────────────────────────
const baseDir = path.join(process.cwd(), 'artifacts/incoming/liquidations', cfg.dir);
if (!fs.existsSync(baseDir)) {
  console.log(`[NEEDS_DATA] SIG_RDY01 missing liquidation directory for ${args.provider}`);
  process.exit(2);
}

const runId = args.runId || fs.readdirSync(baseDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort((a, b) => a.localeCompare(b))
  .at(-1) || '';
if (!runId) { console.log(`[NEEDS_DATA] SIG_RDY01 no runs found for ${args.provider}`); process.exit(2); }

const rawPath = path.join(baseDir, runId, 'raw.jsonl');
const lockPath = path.join(baseDir, runId, 'lock.json');
if (!fs.existsSync(rawPath) || !fs.existsSync(lockPath)) {
  console.log(`[NEEDS_DATA] SIG_RDY01 missing raw/lock in run ${runId}`);
  process.exit(2);
}

// ── Validate raw against lock ─────────────────────────────────────────────────
const rawContent = fs.readFileSync(rawPath, 'utf8');
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
if (lock.provider_id !== args.provider) fail('SIG_RDY02', 'provider_id mismatch');
if (lock.schema_version !== cfg.schema) fail('SIG_RDY02', 'schema_version mismatch');
if (lock.time_unit_sentinel !== 'ms') fail('SIG_RDY02', 'time_unit_sentinel mismatch');
if (sha256(rawContent) !== lock.raw_capture_sha256) fail('SIG_RDY02', 'raw_capture_sha256 mismatch');

// ── Parse rows ────────────────────────────────────────────────────────────────
const rows = rawContent.split('\n')
  .map((v) => v.trim())
  .filter(Boolean)
  .map((line) => {
    const r = JSON.parse(line);
    return {
      symbol: String(r.symbol),
      side: String(r.side),
      ts: Number(r.ts),
      v: Number(r.v),
    };
  });
if (rows.length === 0) fail('SIG_RDY02', 'empty raw rows');

// ── Feature computation ───────────────────────────────────────────────────────
const windowMs = args.windowMs;

// Group by symbol → bar_ts (floor to windowMs boundary)
const barMap = new Map(); // key: `${symbol}:${bar_ts}` → { symbol, bar_ts, sell_vol, buy_vol }

for (const row of rows) {
  const bar_ts = Math.floor(row.ts / windowMs) * windowMs;
  const key = `${row.symbol}:${bar_ts}`;
  if (!barMap.has(key)) barMap.set(key, { symbol: row.symbol, bar_ts, sell_vol: 0, buy_vol: 0 });
  const bar = barMap.get(key);
  if (row.side === 'Sell') bar.sell_vol += row.v;
  else if (row.side === 'Buy') bar.buy_vol += row.v;
}

// Sort bars: (symbol ASC, bar_ts ASC) — deterministic
const bars = [...barMap.values()].sort((a, b) =>
  a.symbol !== b.symbol ? a.symbol.localeCompare(b.symbol) : a.bar_ts - b.bar_ts
);

// Per-symbol rolling mean (ROLLING_WINDOW_BARS preceding bars)
const symbolHistory = new Map(); // symbol → [total_vol, ...]

const features = bars.map((bar) => {
  const total_vol = bar.sell_vol + bar.buy_vol;
  const liq_pressure = total_vol > 0 ? bar.sell_vol / total_vol : 0.5;

  // Rolling mean (exclude current bar — look-back only)
  if (!symbolHistory.has(bar.symbol)) symbolHistory.set(bar.symbol, []);
  const history = symbolHistory.get(bar.symbol);
  const rolling_mean = history.length > 0
    ? history.slice(-ROLLING_WINDOW_BARS).reduce((s, v) => s + v, 0) / Math.min(history.length, ROLLING_WINDOW_BARS)
    : total_vol; // first bar: baseline = self → burst_score=1.0
  const burst_score = rolling_mean > 0 ? total_vol / rolling_mean : 1.0;

  // Update history AFTER computing burst_score (no look-ahead)
  history.push(total_vol);

  // Regime classification
  let regime_flag;
  if (liq_pressure >= BEAR_LIQ_THRESHOLD) {
    regime_flag = burst_score >= BURST_THRESHOLD ? 'BEAR_LIQ_BURST' : 'BEAR_LIQ';
  } else if (liq_pressure <= BULL_LIQ_THRESHOLD) {
    regime_flag = burst_score >= BURST_THRESHOLD ? 'BULL_LIQ_BURST' : 'BULL_LIQ';
  } else {
    regime_flag = burst_score >= BURST_THRESHOLD ? 'NEUTRAL_BURST' : 'NEUTRAL';
  }

  return {
    schema_version: FEATURES_SCHEMA_VERSION,
    provider_id: args.provider,
    run_id: runId,
    symbol: bar.symbol,
    bar_ts_ms: bar.bar_ts,
    window_ms: windowMs,
    sell_vol: bar.sell_vol,
    buy_vol: bar.buy_vol,
    total_vol,
    liq_pressure: Math.round(liq_pressure * 1e6) / 1e6,
    burst_score: Math.round(burst_score * 1e6) / 1e6,
    regime_flag,
  };
});

// ── Write outputs ─────────────────────────────────────────────────────────────
const outDir = path.join(process.cwd(), 'artifacts/outgoing');
fs.mkdirSync(outDir, { recursive: true });

const jsonlLines = features.map((f) => JSON.stringify(canon(f)));
const jsonlContent = jsonlLines.join('\n') + '\n';
const jsonlSha = sha256(jsonlContent);

const featureSchemaCanon = {
  bar_ts_ms: 'integer_ms',
  burst_score: 'float_deterministic',
  buy_vol: 'float',
  liq_pressure: 'float_0_to_1',
  provider_id: 'string',
  regime_flag: 'BEAR_LIQ|BEAR_LIQ_BURST|BULL_LIQ|BULL_LIQ_BURST|NEUTRAL|NEUTRAL_BURST',
  run_id: 'string',
  schema_version: FEATURES_SCHEMA_VERSION,
  sell_vol: 'float',
  symbol: 'string',
  total_vol: 'float',
  window_ms: 'integer_ms',
};

const featureLock = {
  schema_version: FEATURES_SCHEMA_VERSION,
  provider_id: args.provider,
  source_run_id: runId,
  window_ms: windowMs,
  bars_n: features.length,
  symbols: [...new Set(features.map((f) => f.symbol))].sort(),
  rolling_window_bars: ROLLING_WINDOW_BARS,
  burst_threshold: BURST_THRESHOLD,
  bear_liq_threshold: BEAR_LIQ_THRESHOLD,
  bull_liq_threshold: BULL_LIQ_THRESHOLD,
  features_jsonl_sha256: jsonlSha,
  feature_schema: featureSchemaCanon,
};

const jsonlPath = path.join(outDir, 'features_liq.jsonl');
const lockOutPath = path.join(outDir, 'features_liq.lock.json');

fs.writeFileSync(jsonlPath, jsonlContent);
fs.writeFileSync(lockOutPath, JSON.stringify(featureLock, null, 2) + '\n');

// ── Summary ───────────────────────────────────────────────────────────────────
const regimeCounts = features.reduce((m, f) => {
  m[f.regime_flag] = (m[f.regime_flag] || 0) + 1;
  return m;
}, {});

console.log(`[PASS] edge_liq_02_signals — provider=${args.provider} run_id=${runId} bars=${features.length} sha256=${jsonlSha.slice(0, 16)}...`);
console.log(`  liq_pressure_range: [${Math.min(...features.map(f => f.liq_pressure)).toFixed(4)}, ${Math.max(...features.map(f => f.liq_pressure)).toFixed(4)}]`);
console.log(`  burst_score_range:  [${Math.min(...features.map(f => f.burst_score)).toFixed(4)}, ${Math.max(...features.map(f => f.burst_score)).toFixed(4)}]`);
console.log(`  regime_counts: ${JSON.stringify(regimeCounts)}`);
console.log(`  features_liq.jsonl:      ${jsonlPath}`);
console.log(`  features_liq.lock.json:  ${lockOutPath}`);
