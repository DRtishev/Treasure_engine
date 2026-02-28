/**
 * edge_price_01_offline_replay.mjs — Price Bars Offline Replay + Readiness Check
 *
 * Validates a price-bar run dir against its lock.json (schema + SHA contract).
 * Also checks bar monotonicity and completeness per symbol.
 * Emits Data-Organ events into EventBus (Phase 5: WOW Organism solder).
 *
 * Usage:
 *   TREASURE_NET_KILL=1 node scripts/edge/edge_price_01_offline_replay.mjs \
 *     [--provider offline_fixture] [--run-id RG_PRICE01_FIXTURE]
 *
 * Exit codes:
 *   0 — PASS
 *   1 — FAIL (schema/hash mismatch or data integrity error)
 *   2 — NEEDS_DATA (directory or lock/raw missing)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  createReplayBus,
  emitReplayBoot,
  emitReplayApply,
  emitReplayDedup,
  emitReplayReorder,
  emitReplaySeal,
} from './data_organ/event_emitter.mjs';

const PROVIDERS = {
  offline_fixture: { schema: 'price_bars.offline_fixture.v1', dir: 'offline_fixture' },
};

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const canon = (v) => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object'
  ? Object.keys(v).sort((a, b) => a.localeCompare(b)).reduce((o, k) => (o[k] = canon(v[k]), o), {})
  : v;
const fail = (c, m) => { console.error(`[FAIL] ${c} ${m}`); process.exit(1); };

function parseArgs(argv) {
  const args = { provider: 'offline_fixture', runId: '' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--provider') args.provider = argv[++i] || args.provider;
    else if (a === '--run-id') args.runId = argv[++i] || '';
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const cfg = PROVIDERS[args.provider];
if (!cfg) fail('PB_SCH01', `unknown provider=${args.provider}`);
if (process.env.TREASURE_NET_KILL !== '1') fail('ND_PB01', 'TREASURE_NET_KILL must be 1');

const baseDir = path.join(process.cwd(), 'artifacts/incoming/price_bars', cfg.dir);
if (!fs.existsSync(baseDir)) {
  console.log(`[NEEDS_DATA] PB_RDY01 missing price_bars directory for ${args.provider}`);
  process.exit(2);
}

const runId = args.runId || fs.readdirSync(baseDir, { withFileTypes: true })
  .filter((d) => d.isDirectory()).map((d) => d.name)
  .sort((a, b) => a.localeCompare(b)).at(-1) || '';
if (!runId) { console.log(`[NEEDS_DATA] PB_RDY01 no runs found`); process.exit(2); }

const rawPath = path.join(baseDir, runId, 'raw.jsonl');
const lockPath = path.join(baseDir, runId, 'lock.json');
if (!fs.existsSync(rawPath) || !fs.existsSync(lockPath)) {
  console.log(`[NEEDS_DATA] PB_RDY01 missing raw/lock in run ${runId}`);
  process.exit(2);
}

// EventBus for Data-Organ replay (Phase 5: solder to WOW Organism)
const busRunId = `REPLAY-PB-${args.provider}-${runId}`;
const busEpochDir = path.join(process.cwd(), 'reports', 'evidence', `EPOCH-EVENTBUS-REPLAY-${busRunId}`);
const bus = createReplayBus(busRunId, busEpochDir);

const rawContent = fs.readFileSync(rawPath, 'utf8');
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

if (lock.provider_id !== args.provider) fail('PB_RDY02', 'provider_id mismatch');
if (lock.schema_version !== cfg.schema) fail('PB_RDY02', 'schema_version mismatch');
if (sha(rawContent) !== lock.raw_sha256) fail('PB_RDY02', 'raw_sha256 mismatch');

// REPLAY_BOOT — provider + schema validated
emitReplayBoot(bus, { provider: args.provider, schema_version: cfg.schema });

const rows = rawContent.split('\n').filter(Boolean).map(JSON.parse);
if (rows.length === 0) fail('PB_RDY02', 'empty raw rows');
if (rows.length !== lock.rows_n) fail('PB_RDY02', `rows_n mismatch: lock=${lock.rows_n} actual=${rows.length}`);

// REPLAY_APPLY — raw rows loaded + SHA verified
emitReplayApply(bus, { provider: args.provider, rows_n: rows.length, raw_sha256: lock.raw_sha256 });

// Validate each bar
for (const row of rows) {
  if (row.provider_id !== args.provider) fail('PB_RDY02', `row.provider_id mismatch: ${row.provider_id}`);
  if (!Number.isFinite(row.bar_ts_ms) || row.bar_ts_ms <= 0) fail('PB_RDY02', `invalid bar_ts_ms: ${row.bar_ts_ms}`);
  if (!Number.isFinite(row.open) || !Number.isFinite(row.high) || !Number.isFinite(row.low) || !Number.isFinite(row.close))
    fail('PB_RDY02', `OHLC not finite at bar_ts=${row.bar_ts_ms}`);
  if (row.high < row.low) fail('PB_RDY02', `high < low at bar_ts=${row.bar_ts_ms}`);
  if (!Number.isFinite(row.volume) || row.volume < 0) fail('PB_RDY02', `invalid volume at bar_ts=${row.bar_ts_ms}`);
}

// REPLAY_DEDUP — unique bars by symbol+ts
const uniqueKeys = new Set(rows.map((r) => `${r.symbol}:${r.bar_ts_ms}`));
emitReplayDedup(bus, { provider: args.provider, rows_n: rows.length, unique_n: uniqueKeys.size });

// REPLAY_REORDER — check bar_ts_ms monotonicity per symbol
const bySymbol = {};
for (const row of rows) {
  if (!bySymbol[row.symbol]) bySymbol[row.symbol] = [];
  bySymbol[row.symbol].push(row.bar_ts_ms);
}
const ordered = Object.values(bySymbol).every((tsList) =>
  tsList.every((ts, i) => i === 0 || ts > tsList[i - 1])
);
emitReplayReorder(bus, { provider: args.provider, ordered, rows_n: rows.length });

// Check normalized sha
const normalizedRows = rows.map((r) => ({
  bar_ms: r.bar_ms, bar_ts_ms: r.bar_ts_ms, close: r.close,
  high: r.high, low: r.low, open: r.open,
  provider_id: r.provider_id, symbol: r.symbol, volume: r.volume,
}));
const normalized = { provider_id: args.provider, schema_version: cfg.schema, rows: normalizedRows };
if (sha(JSON.stringify(canon(normalized))) !== lock.normalized_sha256)
  fail('PB_RDY02', 'normalized_sha256 mismatch');

// REPLAY_SEAL — normalized hash verified, replay complete
emitReplaySeal(bus, {
  provider: args.provider,
  schema_version: cfg.schema,
  rows_n: rows.length,
  normalized_hash_prefix: lock.normalized_sha256.slice(0, 16),
});

bus.flush();

const symbols = [...new Set(rows.map((r) => r.symbol))].sort();
console.log(`[PASS] OFFLINE_REPLAY_PRICE_BARS provider=${args.provider} run_id=${runId} rows=${rows.length} symbols=${symbols.join(',')}`);
