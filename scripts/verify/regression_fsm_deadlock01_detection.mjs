/**
 * regression_fsm_deadlock01_detection.mjs — RG_FSM_DEADLOCK01
 *
 * SPRINT-2 regression gate: Verifies that state_manager.mjs:runToGoal()
 * includes deadlock detection code (sameStateCount tracking + threshold check).
 *
 * Checks:
 *   1. state_manager.mjs contains `sameStateCount` variable
 *   2. state_manager.mjs contains `deadlock_threshold` or `stuckThreshold`
 *   3. state_manager.mjs returns with reason 'deadlock_detected'
 *   4. FSM_DEADLOCK reason_code exists in code
 *
 * Write-scope: reports/evidence/EXECUTOR/gates/manual/regression_fsm_deadlock01.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:fsm-deadlock01-detection';
const checks = [];

const SM_PATH = path.join(ROOT, 'scripts/ops/state_manager.mjs');

if (!fs.existsSync(SM_PATH)) {
  checks.push({ check: 'state_manager_exists', pass: false, detail: 'FAIL: state_manager.mjs not found' });
} else {
  const src = fs.readFileSync(SM_PATH, 'utf8');

  // Check 1: sameStateCount tracking
  const hasSameStateCount = /sameStateCount/.test(src);
  checks.push({
    check: 'has_sameStateCount',
    pass: hasSameStateCount,
    detail: hasSameStateCount ? 'OK: sameStateCount variable present' : 'FAIL: sameStateCount not found',
  });

  // Check 2: threshold variable
  const hasThreshold = /stuckThreshold|deadlock_threshold/.test(src);
  checks.push({
    check: 'has_deadlock_threshold',
    pass: hasThreshold,
    detail: hasThreshold ? 'OK: deadlock threshold present' : 'FAIL: deadlock threshold not found',
  });

  // Check 3: deadlock_detected reason in return
  const hasDeadlockReturn = /reason.*deadlock_detected|deadlock_detected/.test(src);
  checks.push({
    check: 'returns_deadlock_detected',
    pass: hasDeadlockReturn,
    detail: hasDeadlockReturn ? 'OK: deadlock_detected return path exists' : 'FAIL: deadlock_detected return not found',
  });

  // Check 4: FSM_DEADLOCK reason_code
  const hasFsmDeadlock = /FSM_DEADLOCK/.test(src);
  checks.push({
    check: 'has_FSM_DEADLOCK_code',
    pass: hasFsmDeadlock,
    detail: hasFsmDeadlock ? 'OK: FSM_DEADLOCK reason_code present' : 'FAIL: FSM_DEADLOCK not found',
  });
}

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_FSM_DEADLOCK01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_FSM_DEADLOCK01.md'), [
  '# RG_FSM_DEADLOCK01: FSM Deadlock Detection', '',
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

writeJsonDeterministic(path.join(MANUAL, 'regression_fsm_deadlock01.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_FSM_DEADLOCK01',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_fsm_deadlock01_detection — ${reason_code}`);
if (failed.length > 0) for (const f of failed) console.log(`  VIOLATION: ${f.check}: ${f.detail}`);
process.exit(status === 'PASS' ? 0 : 1);
