/**
 * regression_kill_switch01_triggers.mjs — RG_KILL_SWITCH01
 *
 * SPRINT-3 regression gate: Verifies kill switch evaluator fires correctly.
 *
 * Checks:
 *   1. evaluateKillSwitch exists and is a function
 *   2. Triggers FLATTEN on max_drawdown > 0.05
 *   3. Triggers PAUSE on reality_gap > 0.3
 *   4. Returns triggered=false when all metrics are safe
 *   5. FLATTEN wins over PAUSE when both triggered (priority)
 *   6. kill_switch_matrix.json has ≥3 conditions
 *
 * Write-scope: reports/evidence/EXECUTOR/gates/manual/regression_kill_switch01.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:kill-switch01-triggers';
const checks = [];

try {
  const { evaluateKillSwitch } = await import('../../core/risk/kill_switch.mjs');
  const matrix = JSON.parse(fs.readFileSync(path.join(ROOT, 'specs/kill_switch_matrix.json'), 'utf8'));

  // Check 1: function exists
  const isFn = typeof evaluateKillSwitch === 'function';
  checks.push({ check: 'evaluateKillSwitch_is_function', pass: isFn, detail: isFn ? 'OK' : 'FAIL: not a function' });

  // Check 2: FLATTEN on max_drawdown > 0.05
  const r2 = evaluateKillSwitch({ max_drawdown: 0.1 }, matrix);
  const p2 = r2.triggered === true && r2.action === 'FLATTEN';
  checks.push({ check: 'flatten_on_drawdown', pass: p2, detail: p2 ? 'OK: max_drawdown=0.1 → FLATTEN' : `FAIL: got triggered=${r2.triggered} action=${r2.action}` });

  // Check 3: PAUSE on reality_gap > 0.3
  const r3 = evaluateKillSwitch({ reality_gap: 0.5 }, matrix);
  const p3 = r3.triggered === true && r3.action === 'PAUSE';
  checks.push({ check: 'pause_on_reality_gap', pass: p3, detail: p3 ? 'OK: reality_gap=0.5 → PAUSE' : `FAIL: got triggered=${r3.triggered} action=${r3.action}` });

  // Check 4: No trigger when safe
  const r4 = evaluateKillSwitch({ max_drawdown: 0.01, reality_gap: 0.1, exchange_error_rate: 0.01, consecutive_losses: 2 }, matrix);
  const p4 = r4.triggered === false;
  checks.push({ check: 'no_trigger_when_safe', pass: p4, detail: p4 ? 'OK: safe metrics → no trigger' : `FAIL: got triggered=${r4.triggered}` });

  // Check 5: FLATTEN wins over PAUSE (priority)
  const r5 = evaluateKillSwitch({ max_drawdown: 0.1, reality_gap: 0.5 }, matrix);
  const p5 = r5.triggered === true && r5.action === 'FLATTEN';
  checks.push({ check: 'flatten_wins_over_pause', pass: p5, detail: p5 ? 'OK: FLATTEN priority wins' : `FAIL: got action=${r5.action}` });

  // Check 6: matrix has ≥3 conditions
  const p6 = Array.isArray(matrix.conditions) && matrix.conditions.length >= 3;
  checks.push({ check: 'matrix_has_3plus_conditions', pass: p6, detail: p6 ? `OK: ${matrix.conditions.length} conditions` : `FAIL: ${matrix.conditions?.length || 0} conditions` });

} catch (err) {
  checks.push({ check: 'import_kill_switch', pass: false, detail: `FAIL: ${err.message}` });
}

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_KILL_SWITCH01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_KILL_SWITCH01.md'), [
  '# RG_KILL_SWITCH01: Kill Switch Triggers', '',
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

writeJsonDeterministic(path.join(MANUAL, 'regression_kill_switch01.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_KILL_SWITCH01',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_kill_switch01_triggers — ${reason_code}`);
if (failed.length > 0) for (const f of failed) console.log(`  VIOLATION: ${f.check}: ${f.detail}`);
process.exit(status === 'PASS' ? 0 : 1);
