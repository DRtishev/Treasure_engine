/**
 * regression_paper03_metrics_contract.mjs — RG_PAPER03
 *
 * Verifies that paper_sim.lock.json (v2) has the canonical metrics schema:
 *   - schema_version === 'paper_sim.v2'
 *   - Required top-level fields present with correct types
 *   - params block present with fee_rate, slippage_bps, cooldown_bars
 *   - Numeric metrics are finite or null (not NaN, not undefined)
 *   - paper_sim_sha256 is 64-char hex
 *   - JSONL row schema validated (required per-row fields present)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const LOCK_PATH = path.join(ROOT, 'artifacts/outgoing/paper_sim.lock.json');
const JSONL_PATH = path.join(ROOT, 'artifacts/outgoing/paper_sim.jsonl');
const FIXTURE_SCRIPT = path.join(ROOT, 'scripts/edge/edge_price_00_bars_fixture.mjs');
const LIQ_FIX = path.join(ROOT, 'scripts/verify/regression_liq_fixture_offline_x2.mjs');
const SIG_SCRIPT = path.join(ROOT, 'scripts/edge/edge_liq_02_signals.mjs');
const PAPER_SCRIPT = path.join(ROOT, 'scripts/edge/edge_paper_00_sim.mjs');

const REQUIRED_LOCK_FIELDS = [
  'schema_version', 'params', 'signals_source', 'price_provider', 'price_run_id',
  'price_schema_version', 'decisions_n', 'closed_n', 'wins_n', 'losses_n',
  'total_pnl_gross', 'total_pnl_net', 'total_fee_cost', 'avg_slippage_cost',
  'win_rate', 'profit_factor', 'expectancy', 'max_drawdown', 'paper_sim_sha256',
];
const REQUIRED_PARAMS_FIELDS = ['fee_rate', 'slippage_bps', 'cooldown_bars'];
const NUMERIC_OR_NULL_FIELDS = [
  'total_pnl_gross', 'total_pnl_net', 'total_fee_cost', 'avg_slippage_cost',
  'win_rate', 'profit_factor', 'expectancy', 'max_drawdown',
];
const REQUIRED_ROW_FIELDS = [
  'schema_version', 'symbol', 'bar_ts_ms', 'regime_flag', 'liq_pressure',
  'burst_score', 'direction', 'entry_price_raw', 'entry_price_adj',
  'exit_bar_ts_ms', 'exit_price_raw', 'exit_price_adj',
  'fee_cost', 'slippage_cost', 'pnl_gross', 'pnl_net', 'closed',
];

const fails = [];

// Ensure inputs are fresh
try {
  execFileSync(process.execPath, [LIQ_FIX], { cwd: ROOT, stdio: 'pipe', encoding: 'utf8', timeout: 15_000 });
  execFileSync(process.execPath, [SIG_SCRIPT, '--provider', 'bybit_ws_v5', '--run-id', 'RG_DATA04_FIXTURE'],
    { env: { ...process.env, TREASURE_NET_KILL: '1' }, cwd: ROOT, stdio: 'pipe', encoding: 'utf8', timeout: 15_000 });
  execFileSync(process.execPath, [FIXTURE_SCRIPT], { cwd: ROOT, stdio: 'pipe', encoding: 'utf8', timeout: 15_000 });
  execFileSync(process.execPath, [PAPER_SCRIPT, '--price-provider', 'offline_fixture', '--price-run-id', 'RG_PRICE01_FIXTURE'],
    { env: { ...process.env, TREASURE_NET_KILL: '1' }, cwd: ROOT, stdio: 'pipe', encoding: 'utf8', timeout: 15_000 });
} catch (e) { fails.push(`SETUP_ERROR: ${e.stderr?.slice(0, 200) || e.message}`); }

if (fails.length === 0) {
  if (!fs.existsSync(LOCK_PATH)) { fails.push('MISSING_LOCK: paper_sim.lock.json'); }
  if (!fs.existsSync(JSONL_PATH)) { fails.push('MISSING_JSONL: paper_sim.jsonl'); }
}

let lock = null;
let rows = [];

if (fails.length === 0) {
  lock = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));

  if (lock.schema_version !== 'paper_sim.v2')
    fails.push(`SCHEMA_VERSION: expected paper_sim.v2, got ${lock.schema_version}`);

  for (const f of REQUIRED_LOCK_FIELDS) {
    if (!(f in lock)) fails.push(`MISSING_LOCK_FIELD: ${f}`);
  }

  if (lock.params && typeof lock.params === 'object') {
    for (const f of REQUIRED_PARAMS_FIELDS) {
      if (!(f in lock.params)) fails.push(`MISSING_PARAMS_FIELD: ${f}`);
      else if (typeof lock.params[f] !== 'number') fails.push(`PARAMS_TYPE: ${f} must be number`);
    }
  } else {
    fails.push('PARAMS_MISSING_OR_WRONG_TYPE');
  }

  for (const f of NUMERIC_OR_NULL_FIELDS) {
    const v = lock[f];
    if (v !== null && (typeof v !== 'number' || !isFinite(v)))
      fails.push(`METRIC_TYPE: ${f} must be finite number or null, got ${typeof v}:${v}`);
  }

  if (typeof lock.paper_sim_sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(lock.paper_sim_sha256))
    fails.push(`SHA256_FORMAT: paper_sim_sha256 must be 64-char hex`);

  if (typeof lock.decisions_n !== 'number' || lock.decisions_n < 0)
    fails.push(`DECISIONS_N: must be non-negative integer`);
  if (typeof lock.closed_n !== 'number' || lock.closed_n < 0)
    fails.push(`CLOSED_N: must be non-negative integer`);

  // JSONL row schema
  rows = fs.readFileSync(JSONL_PATH, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
  for (const row of rows.slice(0, 3)) { // sample first 3
    for (const f of REQUIRED_ROW_FIELDS) {
      if (!(f in row)) fails.push(`ROW_MISSING_FIELD: ${f} in row symbol=${row.symbol}`);
    }
    if (row.schema_version !== 'paper_sim.v2')
      fails.push(`ROW_SCHEMA: expected paper_sim.v2, got ${row.schema_version}`);
    if (!['LONG', 'SHORT'].includes(row.direction))
      fails.push(`ROW_DIRECTION: expected LONG|SHORT, got ${row.direction}`);
  }
}

const ok = fails.length === 0;
const status = ok ? 'PASS' : 'FAIL';
const reason = ok ? 'NONE' : 'RG_PAPER03';

const summary = lock ? `decisions_n=${lock.decisions_n} closed_n=${lock.closed_n} pnl_net=${lock.total_pnl_net} pf=${lock.profit_factor} wr=${lock.win_rate} maxDD=${lock.max_drawdown}` : '(no lock)';

writeMd(path.join(EXEC, 'REGRESSION_PAPER03_METRICS_CONTRACT.md'),
  `# REGRESSION_PAPER03_METRICS_CONTRACT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:regression:paper03-metrics-contract\n\n## Summary\n\n${summary}\n\n${fails.map(f => `- FAIL: ${f}`).join('\n') || '- checks: ALL_PASS'}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_paper03_metrics_contract.json'), {
  schema_version: '1.0.0', status, reason_code: reason, run_id: RUN_ID,
  lock_schema_version: lock?.schema_version ?? null,
  metrics: lock ? {
    decisions_n: lock.decisions_n, closed_n: lock.closed_n,
    total_pnl_net: lock.total_pnl_net, profit_factor: lock.profit_factor,
    win_rate: lock.win_rate, max_drawdown: lock.max_drawdown,
  } : null,
  fails,
});

console.log(`[${status}] regression_paper03_metrics_contract — ${reason}`);
if (!ok) fails.forEach(f => console.error(`  ${f}`));
process.exit(ok ? 0 : 1);
