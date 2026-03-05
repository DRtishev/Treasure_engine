/**
 * regression_idempotency_fast01.mjs — RG_IDEMPOTENCY_FAST01
 *
 * RADICAL-LITE R1 regression gate: Verifies intent idempotency is wired (not stub).
 *
 * Checks:
 *   1. _checkIntentIdempotency does NOT contain the stub pattern "return { created: false }"
 *   2. _checkIntentIdempotency references repoState
 *   3. getKillSwitchMetrics returns real metric keys (no hardcoded zero for all 4)
 *   4. trackFillOutcome method exists
 *   5. stats includes exchange_errors and consecutive_losses
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:idempotency-fast01';
const checks = [];

try {
  const src = fs.readFileSync(path.join(ROOT, 'core/exec/master_executor.mjs'), 'utf8');

  // Check 1: No stub pattern in _checkIntentIdempotency
  const stubPattern = /async\s+_checkIntentIdempotency[^}]*return\s*\{\s*created:\s*false\s*\}\s*;?\s*\}/s;
  const hasStub = stubPattern.test(src);
  checks.push({ check: 'no_idempotency_stub', pass: !hasStub,
    detail: hasStub ? 'FAIL: stub pattern still present' : 'OK: stub removed' });

  // Check 2: References repoState in idempotency check
  const fnMatch = src.match(/async\s+_checkIntentIdempotency\([^)]*\)\s*\{([\s\S]*?)^\s{2}\}/m);
  const fnBody = fnMatch ? fnMatch[1] : '';
  const hasRepoState = fnBody.includes('repoState');
  checks.push({ check: 'idempotency_uses_repoState', pass: hasRepoState,
    detail: hasRepoState ? 'OK: references repoState' : 'FAIL: no repoState reference' });

  // Check 3: getKillSwitchMetrics wires real sources (not all zeros)
  const metricsMatch = src.match(/getKillSwitchMetrics\(\)\s*\{([\s\S]*?)^\s{2}\}/m);
  const metricsBody = metricsMatch ? metricsMatch[1] : '';
  const hasRealDrawdown = !metricsBody.includes('max_drawdown: 0,') && metricsBody.includes('max_drawdown');
  checks.push({ check: 'real_kill_metrics', pass: hasRealDrawdown,
    detail: hasRealDrawdown ? 'OK: max_drawdown wired to real source' : 'FAIL: max_drawdown still hardcoded 0' });

  // Check 4: trackFillOutcome exists
  const hasTrackFill = src.includes('trackFillOutcome');
  checks.push({ check: 'trackFillOutcome_exists', pass: hasTrackFill,
    detail: hasTrackFill ? 'OK' : 'FAIL: trackFillOutcome not found' });

  // Check 5: stats has exchange_errors and consecutive_losses
  const hasExchangeErrors = src.includes('exchange_errors');
  const hasConsecutiveLosses = src.includes('consecutive_losses');
  const p5 = hasExchangeErrors && hasConsecutiveLosses;
  checks.push({ check: 'stats_has_error_and_loss_fields', pass: p5,
    detail: p5 ? 'OK' : `FAIL: exchange_errors=${hasExchangeErrors}, consecutive_losses=${hasConsecutiveLosses}` });

} catch (err) {
  checks.push({ check: 'read_master_executor', pass: false, detail: `FAIL: ${err.message}` });
}

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_IDEMPOTENCY_FAST01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_IDEMPOTENCY_FAST01.md'), [
  '# RG_IDEMPOTENCY_FAST01: Intent Idempotency + Kill Metrics Contract', '',
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

writeJsonDeterministic(path.join(MANUAL, 'regression_idempotency_fast01.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_IDEMPOTENCY_FAST01',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_idempotency_fast01 — ${reason_code}`);
if (failed.length > 0) for (const f of failed) console.log(`  VIOLATION: ${f.check}: ${f.detail}`);
process.exit(status === 'PASS' ? 0 : 1);
