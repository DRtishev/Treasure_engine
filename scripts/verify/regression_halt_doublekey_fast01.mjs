/**
 * regression_halt_doublekey_fast01.mjs — RG_HALT_DOUBLEKEY_FAST01
 *
 * RADICAL-LITE R1 regression gate: Verifies HALT reset requires double-key protocol
 * and kill persistence is wired.
 *
 * Checks:
 *   1. requestManualReset in mode_fsm.mjs checks for file token (HALT_RESET_APPROVED)
 *   2. requestManualReset checks applyFlag parameter
 *   3. requestManualReset does NOT unconditionally set manualResetRequested = true
 *   4. safety_loop.mjs accepts repoState option
 *   5. safety_loop.mjs calls _persistState on state change
 *   6. safety_loop.mjs restores state from checkpoint on init
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:halt-doublekey-fast01';
const checks = [];

try {
  const fsmSrc = fs.readFileSync(path.join(ROOT, 'core/governance/mode_fsm.mjs'), 'utf8');
  const slSrc = fs.readFileSync(path.join(ROOT, 'core/live/safety_loop.mjs'), 'utf8');

  // Check 1: FSM checks for file token
  const hasFileCheck = fsmSrc.includes('HALT_RESET_APPROVED');
  checks.push({ check: 'fsm_checks_file_token', pass: hasFileCheck,
    detail: hasFileCheck ? 'OK: checks HALT_RESET_APPROVED file' : 'FAIL: no file token check' });

  // Check 2: FSM checks applyFlag
  const hasApplyFlag = fsmSrc.includes('applyFlag');
  checks.push({ check: 'fsm_checks_apply_flag', pass: hasApplyFlag,
    detail: hasApplyFlag ? 'OK: checks applyFlag parameter' : 'FAIL: no applyFlag check' });

  // Check 3: manualResetRequested NOT set unconditionally
  // Look for the pattern: the first executable line after requestManualReset should NOT be `this.manualResetRequested = true`
  const fnMatch = fsmSrc.match(/requestManualReset\([^)]*\)\s*\{([\s\S]*?)^\s{2}\}/m);
  const fnBody = fnMatch ? fnMatch[1] : '';
  // Must have a guard before setting manualResetRequested
  const hasGuard = fnBody.includes('applyFlag') && fnBody.includes('fileValid');
  const setsUnconditionally = /requestManualReset\([^)]*\)\s*\{\s*\n\s*this\.manualResetRequested\s*=\s*true/.test(fsmSrc);
  const p3 = hasGuard && !setsUnconditionally;
  checks.push({ check: 'no_unconditional_reset', pass: p3,
    detail: p3 ? 'OK: guarded by double-key' : 'FAIL: unconditional or missing guard' });

  // Check 4: safety_loop accepts repoState
  const hasRepoStateOpt = slSrc.includes('repoState');
  checks.push({ check: 'safety_loop_accepts_repoState', pass: hasRepoStateOpt,
    detail: hasRepoStateOpt ? 'OK' : 'FAIL: no repoState option' });

  // Check 5: safety_loop calls _persistState
  const hasPersist = slSrc.includes('_persistState');
  checks.push({ check: 'safety_loop_persists_state', pass: hasPersist,
    detail: hasPersist ? 'OK: _persistState called' : 'FAIL: no persistence on state change' });

  // Check 6: safety_loop restores from checkpoint on init
  const hasRestore = slSrc.includes('loadCheckpoint');
  checks.push({ check: 'safety_loop_restores_checkpoint', pass: hasRestore,
    detail: hasRestore ? 'OK: restores from checkpoint' : 'FAIL: no checkpoint restore on init' });

} catch (err) {
  checks.push({ check: 'read_source_files', pass: false, detail: `FAIL: ${err.message}` });
}

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_HALT_DOUBLEKEY_FAST01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_HALT_DOUBLEKEY_FAST01.md'), [
  '# RG_HALT_DOUBLEKEY_FAST01: HALT Double-Key + Kill Persistence', '',
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

writeJsonDeterministic(path.join(MANUAL, 'regression_halt_doublekey_fast01.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_HALT_DOUBLEKEY_FAST01',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_halt_doublekey_fast01 — ${reason_code}`);
if (failed.length > 0) for (const f of failed) console.log(`  VIOLATION: ${f.check}: ${f.detail}`);
process.exit(status === 'PASS' ? 0 : 1);
