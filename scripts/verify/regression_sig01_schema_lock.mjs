/**
 * regression_sig01_schema_lock.mjs — RG_SIG01
 *
 * Verifies that features_liq.lock.json satisfies the canonical schema contract:
 *   - Required top-level fields present with correct types
 *   - feature_schema has all required columns with correct type strings
 *   - features_jsonl_sha256 is a 64-char hex string
 *   - schema_version === 'signals.liq.v1'
 *
 * Uses the fixture run (regression_liq_fixture_offline_x2 must have run first OR
 * any prior edge:liq:signals run that left artifacts/outgoing/features_liq.lock.json).
 */
import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const LOCK_PATH = path.join(ROOT, 'artifacts/outgoing/features_liq.lock.json');
const JSONL_PATH = path.join(ROOT, 'artifacts/outgoing/features_liq.jsonl');

const REQUIRED_TOP_FIELDS = [
  'schema_version', 'provider_id', 'source_run_id', 'window_ms',
  'bars_n', 'symbols', 'rolling_window_bars', 'burst_threshold',
  'bear_liq_threshold', 'bull_liq_threshold', 'features_jsonl_sha256',
  'feature_schema',
];

const REQUIRED_FEATURE_SCHEMA_COLS = [
  'bar_ts_ms', 'burst_score', 'liq_pressure', 'long_liq_vol',
  'provider_id', 'regime_flag', 'run_id', 'schema_version',
  'short_liq_vol', 'symbol', 'total_vol', 'window_ms',
];

const VALID_REGIME_FLAGS = new Set([
  'BEAR_LIQ', 'BEAR_LIQ_BURST', 'BULL_LIQ', 'BULL_LIQ_BURST', 'NEUTRAL', 'NEUTRAL_BURST',
]);

const fails = [];

if (!fs.existsSync(LOCK_PATH)) {
  fails.push('MISSING_LOCK: features_liq.lock.json not found — run edge:liq:signals first');
}
if (!fs.existsSync(JSONL_PATH)) {
  fails.push('MISSING_JSONL: features_liq.jsonl not found — run edge:liq:signals first');
}

let lock = null;
if (fails.length === 0) {
  lock = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));

  // schema_version
  if (lock.schema_version !== 'signals.liq.v1')
    fails.push(`SCHEMA_VERSION: expected signals.liq.v1, got ${lock.schema_version}`);

  // required top-level fields
  for (const f of REQUIRED_TOP_FIELDS) {
    if (!(f in lock)) fails.push(`MISSING_FIELD: ${f}`);
  }

  // types
  if (typeof lock.window_ms !== 'number' || !Number.isInteger(lock.window_ms) || lock.window_ms <= 0)
    fails.push(`WINDOW_MS_TYPE: expected positive integer, got ${lock.window_ms}`);
  if (typeof lock.bars_n !== 'number' || !Number.isInteger(lock.bars_n) || lock.bars_n < 0)
    fails.push(`BARS_N_TYPE: expected non-negative integer, got ${lock.bars_n}`);
  if (!Array.isArray(lock.symbols))
    fails.push('SYMBOLS_TYPE: expected array');
  if (typeof lock.rolling_window_bars !== 'number' || lock.rolling_window_bars <= 0)
    fails.push(`ROLLING_WINDOW_BARS: expected positive number, got ${lock.rolling_window_bars}`);
  if (typeof lock.burst_threshold !== 'number' || lock.burst_threshold <= 0)
    fails.push(`BURST_THRESHOLD: expected positive number, got ${lock.burst_threshold}`);
  if (typeof lock.bear_liq_threshold !== 'number')
    fails.push(`BEAR_LIQ_THRESHOLD: expected number, got ${lock.bear_liq_threshold}`);
  if (typeof lock.bull_liq_threshold !== 'number')
    fails.push(`BULL_LIQ_THRESHOLD: expected number, got ${lock.bull_liq_threshold}`);

  // sha256 format
  if (typeof lock.features_jsonl_sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(lock.features_jsonl_sha256))
    fails.push(`SHA256_FORMAT: features_jsonl_sha256 must be 64-char hex, got ${lock.features_jsonl_sha256}`);

  // feature_schema columns
  if (lock.feature_schema && typeof lock.feature_schema === 'object') {
    for (const col of REQUIRED_FEATURE_SCHEMA_COLS) {
      if (!(col in lock.feature_schema)) fails.push(`FEATURE_SCHEMA_MISSING_COL: ${col}`);
    }
    // regime_flag enum string
    if (lock.feature_schema.regime_flag) {
      const declared = new Set(lock.feature_schema.regime_flag.split('|'));
      for (const v of VALID_REGIME_FLAGS) {
        if (!declared.has(v)) fails.push(`REGIME_FLAG_ENUM_MISSING: ${v} not declared in feature_schema`);
      }
    }
  } else {
    fails.push('FEATURE_SCHEMA_TYPE: feature_schema must be an object');
  }

  // Validate SHA256 matches actual JSONL content
  if (fails.filter(f => f.startsWith('SHA256')).length === 0) {
    const { createHash } = await import('node:crypto');
    const jsonlContent = fs.readFileSync(JSONL_PATH, 'utf8');
    const actualSha = createHash('sha256').update(jsonlContent).digest('hex');
    if (actualSha !== lock.features_jsonl_sha256)
      fails.push(`SHA256_MISMATCH: lock=${lock.features_jsonl_sha256} actual=${actualSha}`);
  }
}

const ok = fails.length === 0;
const status = ok ? 'PASS' : 'FAIL';
const reason = ok ? 'NONE' : 'RG_SIG01';

writeMd(
  path.join(EXEC, 'REGRESSION_SIG01_SCHEMA_LOCK.md'),
  `# REGRESSION_SIG01_SCHEMA_LOCK.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:regression:sig01-schema-lock\n\n${fails.map(f => `- FAIL: ${f}`).join('\n') || '- checks: ALL_PASS'}\n`,
);
writeJsonDeterministic(path.join(MANUAL, 'regression_sig01_schema_lock.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reason,
  run_id: RUN_ID,
  fails,
  lock_path: LOCK_PATH,
  bars_n: lock?.bars_n ?? null,
  symbols: lock?.symbols ?? null,
  features_jsonl_sha256: lock?.features_jsonl_sha256 ?? null,
});

console.log(`[${status}] regression_sig01_schema_lock — ${reason}`);
if (!ok) fails.forEach(f => console.error(`  ${f}`));
process.exit(ok ? 0 : 1);
