/**
 * regression_fix01_lock_schema.mjs — RG_FIX01
 *
 * Verifies that artifacts/fixtures/ lock.json files satisfy schema contracts:
 *   - liq fixture lock: provider_id, schema_version, rows_n, symbols, raw_capture_sha256, normalized_schema_sha256
 *   - price fixture lock: provider_id, schema_version, rows_n, symbols, raw_sha256, normalized_sha256
 *   - SHA fields are 64-char hex
 *   - rows_n > 0
 */
import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const LIQ_LOCK = path.join(ROOT, 'artifacts/fixtures/liq/bybit_ws_v5/v2/lock.json');
const PRICE_LOCK = path.join(ROOT, 'artifacts/fixtures/price/offline_fixture/v1/lock.json');

const fails = [];

function checkLock(p, requiredFields, label) {
  if (!fs.existsSync(p)) { fails.push(`${label} MISSING: ${p}`); return null; }
  const lock = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const f of requiredFields) {
    if (!(f in lock)) fails.push(`${label} MISSING_FIELD: ${f}`);
  }
  if (lock.rows_n !== undefined && (typeof lock.rows_n !== 'number' || lock.rows_n <= 0))
    fails.push(`${label} ROWS_N: must be positive integer, got ${lock.rows_n}`);
  if (!Array.isArray(lock.symbols) || lock.symbols.length === 0)
    fails.push(`${label} SYMBOLS: must be non-empty array`);
  const sha64 = /^[0-9a-f]{64}$/;
  for (const f of requiredFields.filter(f => f.endsWith('sha256') || f.endsWith('sha'))) {
    if (lock[f] && !sha64.test(lock[f]))
      fails.push(`${label} SHA_FORMAT: ${f} = ${String(lock[f]).slice(0, 16)}...`);
  }
  return lock;
}

const liqLock = checkLock(LIQ_LOCK, [
  'provider_id', 'schema_version', 'time_unit_sentinel', 'run_id', 'rows_n',
  'symbols', 'raw_capture_sha256', 'normalized_schema_sha256', 'captured_at_utc',
], 'LIQ');

const priceLock = checkLock(PRICE_LOCK, [
  'provider_id', 'schema_version', 'run_id', 'bar_ms', 'rows_n',
  'symbols', 'raw_sha256', 'normalized_sha256', 'captured_at_utc',
], 'PRICE');

if (liqLock) {
  if (liqLock.schema_version !== 'liquidations.bybit_ws_v5.v2')
    fails.push(`LIQ SCHEMA_VERSION: expected liquidations.bybit_ws_v5.v2, got ${liqLock.schema_version}`);
  if (liqLock.time_unit_sentinel !== 'ms')
    fails.push(`LIQ TIME_UNIT: expected ms`);
}
if (priceLock) {
  if (priceLock.schema_version !== 'price_bars.offline_fixture.v1')
    fails.push(`PRICE SCHEMA_VERSION: expected price_bars.offline_fixture.v1, got ${priceLock.schema_version}`);
  if (typeof priceLock.bar_ms !== 'number' || priceLock.bar_ms <= 0)
    fails.push(`PRICE BAR_MS: must be positive number`);
}

const ok = fails.length === 0;
const status = ok ? 'PASS' : 'FAIL';
const reason = ok ? 'NONE' : 'RG_FIX01';

writeMd(path.join(EXEC, 'REGRESSION_FIX01_LOCK_SCHEMA.md'),
  `# REGRESSION_FIX01_LOCK_SCHEMA.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:regression:fix01-lock-schema\n\n## Liq lock\n\n- rows_n=${liqLock?.rows_n} symbols=${liqLock?.symbols?.join(',')}\n- schema_version=${liqLock?.schema_version}\n\n## Price lock\n\n- rows_n=${priceLock?.rows_n} symbols=${priceLock?.symbols?.join(',')}\n- schema_version=${priceLock?.schema_version}\n\n${fails.map(f => `- FAIL: ${f}`).join('\n') || '- checks: ALL_PASS'}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_fix01_lock_schema.json'), {
  schema_version: '1.0.0', status, reason_code: reason, run_id: RUN_ID,
  liq: liqLock ? { rows_n: liqLock.rows_n, symbols: liqLock.symbols } : null,
  price: priceLock ? { rows_n: priceLock.rows_n, symbols: priceLock.symbols } : null,
  fails,
});

console.log(`[${status}] regression_fix01_lock_schema — ${reason}`);
if (!ok) fails.forEach(f => console.error(`  ${f}`));
process.exit(ok ? 0 : 1);
