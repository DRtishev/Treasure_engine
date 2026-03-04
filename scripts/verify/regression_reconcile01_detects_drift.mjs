/**
 * regression_reconcile01_detects_drift.mjs — RG_RECONCILE01
 *
 * SPRINT-3 regression gate: Verifies fill reconciliation detects drift.
 *
 * Checks:
 *   1. reconcile() function exists and is callable
 *   2. Detects PRICE_DRIFT with synthetic data
 *   3. Detects SIZE_DRIFT with synthetic data
 *   4. Detects MISSING_ON_EXCHANGE
 *   5. Detects MISSING_IN_LEDGER
 *   6. Returns ok=true when fills match
 *
 * Write-scope: reports/evidence/EXECUTOR/gates/manual/regression_reconcile01.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:reconcile01-detects-drift';
const checks = [];

try {
  const { reconcile } = await import('../../core/recon/reconcile_v1.mjs');

  // Check 1: function exists
  const isFn = typeof reconcile === 'function';
  checks.push({ check: 'reconcile_is_function', pass: isFn, detail: isFn ? 'OK' : 'FAIL: not a function' });

  // Check 2: Detects PRICE_DRIFT
  const ledger2 = [{ order_id: 'O1', price: 100, size: 1 }];
  const exch2 = [{ order_id: 'O1', price: 110, size: 1 }]; // 10% drift
  const r2 = reconcile(ledger2, exch2, 0.01);
  const p2 = !r2.ok && r2.drifts.some(d => d.type === 'PRICE_DRIFT');
  checks.push({ check: 'detects_price_drift', pass: p2, detail: p2 ? 'OK: PRICE_DRIFT detected' : `FAIL: ok=${r2.ok} drifts=${JSON.stringify(r2.drifts)}` });

  // Check 3: Detects SIZE_DRIFT
  const ledger3 = [{ order_id: 'O2', price: 100, size: 1.0 }];
  const exch3 = [{ order_id: 'O2', price: 100, size: 1.5 }]; // 50% drift
  const r3 = reconcile(ledger3, exch3, 0.01);
  const p3 = !r3.ok && r3.drifts.some(d => d.type === 'SIZE_DRIFT');
  checks.push({ check: 'detects_size_drift', pass: p3, detail: p3 ? 'OK: SIZE_DRIFT detected' : `FAIL: ok=${r3.ok} drifts=${JSON.stringify(r3.drifts)}` });

  // Check 4: Detects MISSING_ON_EXCHANGE
  const ledger4 = [{ order_id: 'O3', price: 50, size: 2 }];
  const exch4 = [];
  const r4 = reconcile(ledger4, exch4, 0.01);
  const p4 = !r4.ok && r4.drifts.some(d => d.type === 'MISSING_ON_EXCHANGE');
  checks.push({ check: 'detects_missing_on_exchange', pass: p4, detail: p4 ? 'OK: MISSING_ON_EXCHANGE detected' : `FAIL: ok=${r4.ok}` });

  // Check 5: Detects MISSING_IN_LEDGER
  const ledger5 = [];
  const exch5 = [{ order_id: 'O4', price: 75, size: 3 }];
  const r5 = reconcile(ledger5, exch5, 0.01);
  const p5 = !r5.ok && r5.drifts.some(d => d.type === 'MISSING_IN_LEDGER');
  checks.push({ check: 'detects_missing_in_ledger', pass: p5, detail: p5 ? 'OK: MISSING_IN_LEDGER detected' : `FAIL: ok=${r5.ok}` });

  // Check 6: Returns ok=true when fills match
  const ledger6 = [{ order_id: 'O5', price: 100, size: 1 }];
  const exch6 = [{ order_id: 'O5', price: 100, size: 1 }];
  const r6 = reconcile(ledger6, exch6, 0.01);
  const p6 = r6.ok === true && r6.drifts.length === 0;
  checks.push({ check: 'ok_when_matching', pass: p6, detail: p6 ? 'OK: matching fills → ok=true' : `FAIL: ok=${r6.ok} drifts=${r6.drifts.length}` });

} catch (err) {
  checks.push({ check: 'import_reconcile', pass: false, detail: `FAIL: ${err.message}` });
}

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_RECONCILE01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_RECONCILE01.md'), [
  '# RG_RECONCILE01: Fill Reconciliation Drift Detection', '',
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

writeJsonDeterministic(path.join(MANUAL, 'regression_reconcile01.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_RECONCILE01',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_reconcile01_detects_drift — ${reason_code}`);
if (failed.length > 0) for (const f of failed) console.log(`  VIOLATION: ${f.check}: ${f.detail}`);
process.exit(status === 'PASS' ? 0 : 1);
