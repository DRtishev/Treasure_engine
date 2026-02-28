/**
 * regression_sig03_semantic_mapping.mjs — RG_SIG03
 *
 * Verifies that the liq_side → liq_pressure mapping is semantically correct
 * using the RG_DATA04_FIXTURE:
 *
 *   BTCUSDT: side=Sell(SHORT,v=12) + Buy(LONG,v=4)
 *     → long_liq_vol=4, short_liq_vol=12, total=16
 *     → liq_pressure=0.25 (≤0.35 → BULL_LIQ)
 *
 *   ETHUSDT: side=Sell(SHORT,v=20)
 *     → long_liq_vol=0, short_liq_vol=20, total=20
 *     → liq_pressure=0.0 (≤0.35 → BULL_LIQ)
 *
 * Requires fixture + signals to have run first, OR runs them inline.
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

// Expected per-symbol values from RG_DATA04_FIXTURE (v2 schema, liq_side mapped)
const EXPECTED = {
  BTCUSDT: { long_liq_vol: 4, short_liq_vol: 12, total_vol: 16, liq_pressure: 0.25, regime_flag: 'BULL_LIQ' },
  ETHUSDT: { long_liq_vol: 0, short_liq_vol: 20, total_vol: 20, liq_pressure: 0.0, regime_flag: 'BULL_LIQ' },
};

const FIXTURE_SCRIPT = path.join(ROOT, 'scripts/verify/regression_liq_fixture_offline_x2.mjs');
const SIGNAL_SCRIPT = path.join(ROOT, 'scripts/edge/edge_liq_02_signals.mjs');
const JSONL_PATH = path.join(ROOT, 'artifacts/outgoing/features_liq.jsonl');

const fails = [];

// Step 1: (re)generate fixture
try {
  execFileSync(process.execPath, [FIXTURE_SCRIPT], { cwd: ROOT, stdio: 'pipe', encoding: 'utf8', timeout: 15_000 });
} catch (e) {
  fails.push(`FIXTURE_RUN_ERROR: ${e.stderr || e.message}`);
}

// Step 2: run signals against fixture
if (fails.length === 0) {
  try {
    execFileSync(
      process.execPath,
      [SIGNAL_SCRIPT, '--provider', 'bybit_ws_v5', '--run-id', 'RG_DATA04_FIXTURE'],
      { env: { ...process.env, TREASURE_NET_KILL: '1' }, cwd: ROOT, stdio: 'pipe', encoding: 'utf8', timeout: 15_000 },
    );
  } catch (e) {
    fails.push(`SIGNALS_RUN_ERROR: ${e.stderr || e.message}`);
  }
}

// Step 3: validate output against expected
let featureRows = [];
if (fails.length === 0) {
  if (!fs.existsSync(JSONL_PATH)) {
    fails.push('MISSING_JSONL: features_liq.jsonl not found after signals run');
  } else {
    featureRows = fs.readFileSync(JSONL_PATH, 'utf8')
      .split('\n').filter(Boolean).map(JSON.parse);

    for (const [symbol, exp] of Object.entries(EXPECTED)) {
      const row = featureRows.find((r) => r.symbol === symbol);
      if (!row) {
        fails.push(`MISSING_ROW: symbol=${symbol} not found in features_liq.jsonl`);
        continue;
      }
      // Tolerance for float comparison
      const tol = 1e-5;
      if (Math.abs(row.long_liq_vol - exp.long_liq_vol) > tol)
        fails.push(`${symbol} long_liq_vol: expected=${exp.long_liq_vol} actual=${row.long_liq_vol}`);
      if (Math.abs(row.short_liq_vol - exp.short_liq_vol) > tol)
        fails.push(`${symbol} short_liq_vol: expected=${exp.short_liq_vol} actual=${row.short_liq_vol}`);
      if (Math.abs(row.total_vol - exp.total_vol) > tol)
        fails.push(`${symbol} total_vol: expected=${exp.total_vol} actual=${row.total_vol}`);
      if (Math.abs(row.liq_pressure - exp.liq_pressure) > tol)
        fails.push(`${symbol} liq_pressure: expected=${exp.liq_pressure} actual=${row.liq_pressure}`);
      if (row.regime_flag !== exp.regime_flag)
        fails.push(`${symbol} regime_flag: expected=${exp.regime_flag} actual=${row.regime_flag}`);
    }
  }
}

const ok = fails.length === 0;
const status = ok ? 'PASS' : 'FAIL';
const reason = ok ? 'NONE' : 'RG_SIG03';

const rowSummary = featureRows.map((r) =>
  `- ${r.symbol}: long_liq_vol=${r.long_liq_vol} short_liq_vol=${r.short_liq_vol} liq_pressure=${r.liq_pressure} regime=${r.regime_flag}`
).join('\n');

writeMd(
  path.join(EXEC, 'REGRESSION_SIG03_SEMANTIC_MAPPING.md'),
  `# REGRESSION_SIG03_SEMANTIC_MAPPING.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:regression:sig03-semantic-mapping\n\n## Fixture: RG_DATA04_FIXTURE (bybit_ws_v5 v2, liq_side mapped)\n\n${rowSummary || '(no rows)'}\n\n## Expected\n\n${Object.entries(EXPECTED).map(([s, e]) => `- ${s}: liq_pressure=${e.liq_pressure} regime=${e.regime_flag}`).join('\n')}\n\n${fails.map(f => `- FAIL: ${f}`).join('\n') || '- checks: ALL_PASS'}\n`,
);
writeJsonDeterministic(path.join(MANUAL, 'regression_sig03_semantic_mapping.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reason,
  run_id: RUN_ID,
  fixture: 'RG_DATA04_FIXTURE',
  provider: 'bybit_ws_v5',
  expected: EXPECTED,
  actual: featureRows.reduce((m, r) => {
    m[r.symbol] = { long_liq_vol: r.long_liq_vol, short_liq_vol: r.short_liq_vol, liq_pressure: r.liq_pressure, regime_flag: r.regime_flag };
    return m;
  }, {}),
  fails,
});

console.log(`[${status}] regression_sig03_semantic_mapping — ${reason}`);
if (!ok) fails.forEach(f => console.error(`  ${f}`));
process.exit(ok ? 0 : 1);
