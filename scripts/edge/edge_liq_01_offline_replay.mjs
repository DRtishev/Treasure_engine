import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';

const PROVIDERS = {
  bybit_ws_v5: { schema: 'liquidations.bybit_ws_v5.v2', dir: 'bybit_ws_v5' },
  okx_ws_v5: { schema: 'liquidations.okx_ws_v5.v1', dir: 'okx_ws_v5' },
  binance_forceorder_ws: { schema: 'liquidations.binance_forceorder_ws.v1', dir: 'binance_forceorder_ws' },
};

function parseArgs(argv) {
  const args = { runId: '', provider: 'bybit_ws_v5' };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--run-id') args.runId = argv[++i] || '';
    else if (a === '--provider') args.provider = argv[++i] || '';
  }
  return args;
}

const canon = (v) => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.keys(v).sort((a, b) => a.localeCompare(b)).reduce((o, k) => (o[k] = canon(v[k]), o), {}) : v;
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const fail = (c, m) => { console.error(`[FAIL] ${c} ${m}`); process.exit(1); };

const args = parseArgs(process.argv.slice(2));
const cfg = PROVIDERS[args.provider];
if (!cfg) fail('RDY_SCH01', `unknown provider=${args.provider}`);
if (process.env.TREASURE_NET_KILL !== '1') fail('ND_LIQ01', 'TREASURE_NET_KILL must be 1');

const baseDir = path.join(process.cwd(), 'artifacts/incoming/liquidations', cfg.dir);
if (!fs.existsSync(baseDir)) { console.log(`[NEEDS_DATA] RDY01 missing base directory for ${args.provider}`); process.exit(2); }
const runId = args.runId || fs.readdirSync(baseDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort((a, b) => a.localeCompare(b)).at(-1) || '';
if (!runId) { console.log(`[NEEDS_DATA] RDY01 no runs found for ${args.provider}`); process.exit(2); }

const rawPath = path.join(baseDir, runId, 'raw.jsonl');
const lockPath = path.join(baseDir, runId, 'lock.json');
if (!fs.existsSync(rawPath) || !fs.existsSync(lockPath)) { console.log(`[NEEDS_DATA] RDY01 missing raw/lock in run ${runId}`); process.exit(2); }

const raw = fs.readFileSync(rawPath, 'utf8');
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
if (lock.provider_id !== args.provider) fail('RDY02', 'provider_id mismatch');
if (lock.schema_version !== cfg.schema) fail('RDY02', 'schema_version mismatch');
if (lock.time_unit_sentinel !== 'ms') fail('RDY02', 'time_unit_sentinel mismatch');
if (sha(raw) !== lock.raw_capture_sha256) fail('RDY02', 'raw_capture_sha256 mismatch');

const rows = raw.split('\n').map((v) => v.trim()).filter(Boolean).map(JSON.parse);
if (rows.length === 0) fail('RDY02', 'empty raw rows');
for (const row of rows) {
  if (row.provider_id !== args.provider) fail('RDY02', 'row.provider_id mismatch');
  if (!Number.isFinite(Number(row.ts))) fail('RDY02', 'row.ts invalid');
}

const normalized = { provider_id: args.provider, schema_version: cfg.schema, time_unit_sentinel: 'ms', rows: rows.map((r) => ({ provider_id: r.provider_id, symbol: r.symbol, side: r.side, ts: Number(r.ts), p: String(r.p), v: String(r.v), topic: r.topic || '' })) };
if (sha(JSON.stringify(canon(normalized))) !== lock.normalized_schema_sha256) fail('RDY02', 'normalized_schema_sha256 mismatch');

console.log(`[PASS] OFFLINE_REPLAY_LIQ provider=${args.provider} run_id=${runId} rows=${rows.length}`);
