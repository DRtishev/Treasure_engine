/**
 * regression_metric_parity02_canary_real_dd.mjs — RG_METRIC_PARITY02
 *
 * SPRINT-1 regression gate: Ensures canary fitness_suite.mjs does NOT use
 * drawdown_proxy and uses real HWM max_drawdown instead.
 *
 * Checks:
 *   1. fitness_suite.mjs does NOT contain `drawdown_proxy`
 *   2. fitness_suite.mjs contains `max_drawdown` field
 *   3. fitness_suite.mjs contains `computeMaxDrawdown` function
 *
 * Write-scope: reports/evidence/EXECUTOR/gates/manual/regression_metric_parity02.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:metric-parity02-canary-real-dd';
const checks = [];

const FITNESS_PATH = path.join(ROOT, 'core/canary/fitness_suite.mjs');

if (!fs.existsSync(FITNESS_PATH)) {
  checks.push({ check: 'fitness_suite_exists', pass: false, detail: 'FAIL: fitness_suite.mjs not found' });
} else {
  const src = fs.readFileSync(FITNESS_PATH, 'utf8');

  // Check 1: no drawdown_proxy
  const hasProxy = /drawdown_proxy/.test(src);
  checks.push({
    check: 'no_drawdown_proxy',
    pass: !hasProxy,
    detail: !hasProxy ? 'OK: drawdown_proxy not found' : 'FAIL: drawdown_proxy still present',
  });

  // Check 2: has max_drawdown field
  const hasMaxDD = /max_drawdown\s*:/.test(src);
  checks.push({
    check: 'has_max_drawdown_field',
    pass: hasMaxDD,
    detail: hasMaxDD ? 'OK: max_drawdown field present' : 'FAIL: max_drawdown field not found',
  });

  // Check 3: has computeMaxDrawdown function
  const hasCompute = /computeMaxDrawdown/.test(src);
  checks.push({
    check: 'has_computeMaxDrawdown',
    pass: hasCompute,
    detail: hasCompute ? 'OK: computeMaxDrawdown present' : 'FAIL: computeMaxDrawdown not found',
  });
}

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_METRIC_PARITY02_PROXY_FOUND';

writeMd(path.join(EXEC, 'REGRESSION_METRIC_PARITY02.md'), [
  '# RG_METRIC_PARITY02: Canary Real Drawdown', '',
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

writeJsonDeterministic(path.join(MANUAL, 'regression_metric_parity02.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_METRIC_PARITY02',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_metric_parity02_canary_real_dd — ${reason_code}`);
if (failed.length > 0) for (const f of failed) console.log(`  VIOLATION: ${f.check}: ${f.detail}`);
process.exit(status === 'PASS' ? 0 : 1);
