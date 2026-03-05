/**
 * regression_burnin_fast01.mjs -- RG_BURNIN_FAST01
 *
 * Sprint 11 FAST gate:
 * 1. REALITY_GAP.md exists with required sections
 * 2. LEDGER_RECONCILE.md exists with required sections
 * 3. Calibration contract still valid (not corrupted by burn-in)
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_BURNIN_FAST01';
const NEXT_ACTION = 'npm run -s verify:fast';
const checks = [];

// Check 1: REALITY_GAP.md exists
const gapPath = path.join(ROOT, 'reports/evidence/EPOCH-V2-S11-BURNIN/REALITY_GAP.md');
const gapExists = fs.existsSync(gapPath);
checks.push({
  check: 'reality_gap_exists',
  pass: gapExists,
  detail: gapExists ? 'Present' : 'MISSING'
});

if (gapExists) {
  const content = fs.readFileSync(gapPath, 'utf8');
  const hasSections = content.includes('## Parameter Comparison') && content.includes('## Gap Assessment');
  checks.push({
    check: 'reality_gap_has_sections',
    pass: hasSections,
    detail: hasSections ? 'Required sections present' : 'MISSING required sections'
  });
}

// Check 2: LEDGER_RECONCILE.md exists
const reconcilePath = path.join(ROOT, 'reports/evidence/EPOCH-V2-S11-BURNIN/LEDGER_RECONCILE.md');
const reconcileExists = fs.existsSync(reconcilePath);
checks.push({
  check: 'ledger_reconcile_exists',
  pass: reconcileExists,
  detail: reconcileExists ? 'Present' : 'MISSING'
});

if (reconcileExists) {
  const content = fs.readFileSync(reconcilePath, 'utf8');
  const hasSections = content.includes('## Reconciliation Proof') && content.includes('RECONCILE STATUS');
  checks.push({
    check: 'ledger_reconcile_has_sections',
    pass: hasSections,
    detail: hasSections ? 'Required sections present' : 'MISSING required sections'
  });
}

// Check 3: Calibration contract still valid
const contractPath = path.join(ROOT, 'artifacts/contracts/CALIBRATION_CONTRACT_v1.json');
if (fs.existsSync(contractPath)) {
  try {
    const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    checks.push({
      check: 'calibration_contract_intact',
      pass: !!contract.schema_version && !!contract.params,
      detail: `schema_version=${contract.schema_version}, status=${contract.calibration_status}`
    });
  } catch (e) {
    checks.push({ check: 'calibration_contract_intact', pass: false, detail: `Parse error: ${e.message}` });
  }
} else {
  checks.push({ check: 'calibration_contract_intact', pass: false, detail: 'File not found' });
}

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'BURNIN_FAST01_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_BURNIN_FAST01.md'), [
  '# REGRESSION_BURNIN_FAST01.md', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`, `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_burnin_fast01.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code,
  run_id: RUN_ID, next_action: NEXT_ACTION, checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_burnin_fast01 — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
