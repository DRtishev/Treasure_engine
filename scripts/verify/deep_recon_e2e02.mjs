/**
 * deep_recon_e2e02.mjs — RG_RECON_E2E02
 *
 * R2 deep: Ledger + exchange fills with drift → reconciliation detects correctly.
 * Tests incremental recon with funding support.
 */
import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });
const checks = [];

try {
  const { reconcileIncremental, ReconAction } = await import('../../core/recon/reconcile_v1.mjs');

  // Check 1: No drift → RECON_OK
  const r1 = reconcileIncremental(
    { price: 100, size: 1, fee: 0.04, funding: 0.02 },
    { price: 100, size: 1, fee: 0.04, funding: 0.02 }
  );
  const p1 = r1.action === ReconAction.RECON_OK && r1.ok === true;
  checks.push({ check: 'no_drift_ok', pass: p1, detail: `action=${r1.action}, ok=${r1.ok}` });

  // Check 2: Price drift → HALT
  const r2 = reconcileIncremental(
    { price: 105, size: 1 },
    { price: 100, size: 1 }
  );
  const p2 = r2.action === ReconAction.RECON_HALT_MISMATCH && r2.drifts.length > 0;
  checks.push({ check: 'price_drift_halt', pass: p2, detail: `action=${r2.action}, drifts=${r2.drifts.length}` });

  // Check 3: Fee drift only → WARN
  const r3 = reconcileIncremental(
    { price: 100, size: 1, fee: 0.50 },
    { price: 100, size: 1, fee: 0.04 }
  );
  const p3 = r3.action === ReconAction.RECON_WARN_DRIFT;
  checks.push({ check: 'fee_drift_warn', pass: p3, detail: `action=${r3.action}` });

  // Check 4: Funding drift detected
  const r4 = reconcileIncremental(
    { price: 100, size: 1, funding: 1.0 },
    { price: 100, size: 1, funding: 0.02 }
  );
  const p4 = r4.drifts.some(d => d.type === 'FUNDING_DRIFT');
  checks.push({ check: 'funding_drift_detected', pass: p4,
    detail: p4 ? 'OK: FUNDING_DRIFT found' : `FAIL: drifts=${JSON.stringify(r4.drifts)}` });

  // Check 5: ReconAction constants exist
  const p5 = ReconAction.RECON_OK && ReconAction.RECON_WARN_DRIFT && ReconAction.RECON_HALT_MISMATCH;
  checks.push({ check: 'recon_action_constants', pass: !!p5, detail: p5 ? 'OK' : 'FAIL' });

} catch (err) {
  checks.push({ check: 'e2e_execution', pass: false, detail: `FAIL: ${err.message}` });
}

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_RECON_E2E02_VIOLATION';

writeMd(path.join(EXEC, 'DEEP_RECON_E2E02.md'), [
  '# RG_RECON_E2E02: Reconciliation E2E', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`,
  `CHECKS: ${checks.length}`, `VIOLATIONS: ${failed.length}`, '',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'deep_recon_e2e02.json'), {
  schema_version: '1.0.0', gate_id: 'RG_RECON_E2E02', status, reason_code, run_id: RUN_ID, checks,
});

console.log(`[${status}] deep_recon_e2e02 — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
