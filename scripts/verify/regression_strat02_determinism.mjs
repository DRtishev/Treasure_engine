/**
 * regression_strat02_determinism.mjs — RG_STRAT02_DETERMINISM
 *
 * EPOCH-73 regression gate. Validates strategy determinism x2:
 *   Per strategy (S3/S4/S5):
 *     1. Load e108 fixture → enrichBars()
 *     2. runBacktest x2 with fixed seed
 *     3. Hash canonical metrics (deterministic key ordering) — must match
 *     4. Assert backtest_sharpe exists + finite + > 0
 *
 * Write-scope: reports/evidence/EXECUTOR/gates/manual/regression_strat02_determinism.json
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { enrichBars } from '../../core/edge/strategies/strategy_bar_enricher.mjs';
import { runBacktest } from '../../core/backtest/engine.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:strat02-determinism';
const checks = [];

const FIXTURE_PATH = path.join(ROOT, 'data', 'fixtures', 'e108', 'e108_ohlcv_200bar.json');
const fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
const bars = enrichBars(fixture.candles);

function hashMetrics(metrics) {
  const keys = Object.keys(metrics).filter(k => k !== 'params').sort();
  const canon = {};
  for (const k of keys) canon[k] = metrics[k];
  return crypto.createHash('sha256').update(JSON.stringify(canon)).digest('hex');
}

const STRATEGIES = [
  { path: '../../core/edge/strategies/s3_liq_vol_fusion.mjs', name: 's3' },
  { path: '../../core/edge/strategies/s4_post_cascade_mr.mjs', name: 's4' },
  { path: '../../core/edge/strategies/s5_multi_regime.mjs', name: 's5' },
];

for (const s of STRATEGIES) {
  try {
    const mod = await import(s.path);

    // Run 1
    const r1 = runBacktest(mod, bars, {});
    // Run 2
    const r2 = runBacktest(mod, bars, {});

    const h1 = hashMetrics(r1.metrics);
    const h2 = hashMetrics(r2.metrics);
    const deterministic = h1 === h2;

    checks.push({
      check: `${s.name}_determinism_x2`,
      pass: deterministic,
      detail: deterministic
        ? `OK: hash=${h1.substring(0, 16)} (match)`
        : `FAIL: run1=${h1.substring(0, 16)} run2=${h2.substring(0, 16)}`,
    });

    // Sharpe check
    const sharpe = r1.metrics.backtest_sharpe;
    const sharpeValid = typeof sharpe === 'number' && isFinite(sharpe) && sharpe > 0;
    checks.push({
      check: `${s.name}_sharpe_positive`,
      pass: sharpeValid,
      detail: sharpeValid ? `OK: sharpe=${sharpe}` : `FAIL: sharpe=${sharpe}`,
    });

    // Trade count sanity
    const trades = r1.metrics.trade_count;
    checks.push({
      check: `${s.name}_has_trades`,
      pass: trades > 0,
      detail: trades > 0 ? `OK: trades=${trades}` : `FAIL: trades=${trades}`,
    });
  } catch (e) {
    checks.push({ check: `${s.name}_determinism_x2`, pass: false, detail: `FAIL: ${e.message}` });
    checks.push({ check: `${s.name}_sharpe_positive`, pass: false, detail: 'SKIP: import/run failed' });
    checks.push({ check: `${s.name}_has_trades`, pass: false, detail: 'SKIP: import/run failed' });
  }
}

// Enricher determinism check
const bars2 = enrichBars(fixture.candles);
const enrichHash1 = crypto.createHash('sha256').update(JSON.stringify(bars.map(b => b._liq_pressure))).digest('hex');
const enrichHash2 = crypto.createHash('sha256').update(JSON.stringify(bars2.map(b => b._liq_pressure))).digest('hex');
checks.push({
  check: 'enricher_determinism_x2',
  pass: enrichHash1 === enrichHash2,
  detail: enrichHash1 === enrichHash2
    ? `OK: enricher hash=${enrichHash1.substring(0, 16)} (match)`
    : `FAIL: run1=${enrichHash1.substring(0, 16)} run2=${enrichHash2.substring(0, 16)}`,
});

// Verdict
const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_STRAT02_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_STRAT02_DETERMINISM.md'), [
  '# RG_STRAT02_DETERMINISM', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`,
  `CHECKS_TOTAL: ${checks.length}`,
  `VIOLATIONS: ${failed.length}`, '',
  '## CHECKS',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map(c => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_strat02_determinism.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_STRAT02_DETERMINISM',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_strat02_determinism — ${reason_code}`);
if (failed.length > 0) for (const f of failed) console.log(`  VIOLATION: ${f.check}: ${f.detail}`);
process.exit(status === 'PASS' ? 0 : 1);
