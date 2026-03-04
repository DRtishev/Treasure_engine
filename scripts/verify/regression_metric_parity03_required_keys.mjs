/**
 * regression_metric_parity03_required_keys.mjs — RG_METRIC_PARITY03
 *
 * SPRINT-1 regression gate: Ensures metric_contract.mjs exists and exports
 * REQUIRED_METRIC_KEYS with at least 4 keys, and validateMetrics function.
 *
 * Checks:
 *   1. metric_contract.mjs exists
 *   2. REQUIRED_METRIC_KEYS has >= 4 entries
 *   3. validateMetrics is a function
 *   4. validateMetrics({sharpe:1,max_drawdown:0.1,total_pnl:100,trade_count:50}, 'test') returns valid=true
 *   5. validateMetrics({sharpe:1}, 'test') returns valid=false with missing keys
 *
 * Write-scope: reports/evidence/EXECUTOR/gates/manual/regression_metric_parity03.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:metric-parity03-required-keys';
const checks = [];

const CONTRACT_PATH = path.join(ROOT, 'core/metrics/metric_contract.mjs');

if (!fs.existsSync(CONTRACT_PATH)) {
  checks.push({ check: 'metric_contract_exists', pass: false, detail: 'FAIL: metric_contract.mjs not found' });
} else {
  // Dynamic import for runtime validation
  try {
    const mod = await import(CONTRACT_PATH);

    // Check 1: exists (already passed if we're here)
    checks.push({ check: 'metric_contract_exists', pass: true, detail: 'OK: metric_contract.mjs found' });

    // Check 2: REQUIRED_METRIC_KEYS has >= 4 entries
    const keys = mod.REQUIRED_METRIC_KEYS;
    const has4 = Array.isArray(keys) && keys.length >= 4;
    checks.push({
      check: 'required_keys_min_4',
      pass: has4,
      detail: has4 ? `OK: REQUIRED_METRIC_KEYS has ${keys.length} entries` : `FAIL: REQUIRED_METRIC_KEYS has ${keys?.length ?? 0} entries (need >= 4)`,
    });

    // Check 3: validateMetrics is a function
    const isFn = typeof mod.validateMetrics === 'function';
    checks.push({
      check: 'validateMetrics_is_function',
      pass: isFn,
      detail: isFn ? 'OK: validateMetrics is a function' : 'FAIL: validateMetrics is not a function',
    });

    if (isFn) {
      // Check 4: valid metrics pass
      const validResult = mod.validateMetrics({ sharpe: 1, max_drawdown: 0.1, total_pnl: 100, trade_count: 50 }, 'test');
      const passesValid = validResult.valid === true;
      checks.push({
        check: 'valid_metrics_pass',
        pass: passesValid,
        detail: passesValid ? 'OK: valid metrics accepted' : `FAIL: valid metrics rejected: ${validResult.detail}`,
      });

      // Check 5: incomplete metrics fail
      const invalidResult = mod.validateMetrics({ sharpe: 1 }, 'test');
      const rejectsInvalid = invalidResult.valid === false && invalidResult.missing.length > 0;
      checks.push({
        check: 'incomplete_metrics_fail',
        pass: rejectsInvalid,
        detail: rejectsInvalid ? `OK: incomplete metrics rejected (missing: ${invalidResult.missing.join(', ')})` : 'FAIL: incomplete metrics were not rejected',
      });
    }
  } catch (err) {
    checks.push({ check: 'metric_contract_import', pass: false, detail: `FAIL: import error: ${err.message}` });
  }
}

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_METRIC_PARITY03_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_METRIC_PARITY03.md'), [
  '# RG_METRIC_PARITY03: Required Metric Keys Contract', '',
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

writeJsonDeterministic(path.join(MANUAL, 'regression_metric_parity03.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_METRIC_PARITY03',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_metric_parity03_required_keys — ${reason_code}`);
if (failed.length > 0) for (const f of failed) console.log(`  VIOLATION: ${f.check}: ${f.detail}`);
process.exit(status === 'PASS' ? 0 : 1);
