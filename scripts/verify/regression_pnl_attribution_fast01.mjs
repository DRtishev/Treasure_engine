/**
 * regression_pnl_attribution_fast01.mjs — RG_PNL_ATTRIBUTION_FAST01
 *
 * RADICAL-LITE R2: Verifies ledger has funding tracking + getAttribution exists.
 * Also verifies reconcileIncremental with funding support.
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
  const ledgerSrc = fs.readFileSync(path.join(ROOT, 'core/profit/ledger.mjs'), 'utf8');
  const reconSrc = fs.readFileSync(path.join(ROOT, 'core/recon/reconcile_v1.mjs'), 'utf8');

  // Check 1: ledger has total_funding field
  const p1 = ledgerSrc.includes('total_funding');
  checks.push({ check: 'ledger_has_total_funding', pass: p1,
    detail: p1 ? 'OK' : 'FAIL: total_funding not in ledger' });

  // Check 2: getAttribution function exists
  const p2 = ledgerSrc.includes('export function getAttribution');
  checks.push({ check: 'getAttribution_exists', pass: p2,
    detail: p2 ? 'OK' : 'FAIL: getAttribution not exported' });

  // Check 3: getLedgerSummary returns total_funding
  const p3 = ledgerSrc.includes('total_funding: ledger.total_funding');
  checks.push({ check: 'summary_includes_funding', pass: p3,
    detail: p3 ? 'OK' : 'FAIL: getLedgerSummary missing total_funding' });

  // Check 4: reconcile_v1 has FUNDING_MISMATCH code
  const p4 = reconSrc.includes('FUNDING_MISMATCH');
  checks.push({ check: 'recon_has_funding_mismatch', pass: p4,
    detail: p4 ? 'OK' : 'FAIL: FUNDING_MISMATCH not in reconcile_v1' });

  // Check 5: reconcileIncremental exists
  const p5 = reconSrc.includes('export function reconcileIncremental');
  checks.push({ check: 'reconcileIncremental_exists', pass: p5,
    detail: p5 ? 'OK' : 'FAIL: reconcileIncremental not exported' });

} catch (err) {
  checks.push({ check: 'read_source', pass: false, detail: `FAIL: ${err.message}` });
}

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_PNL_ATTRIBUTION_FAST01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_PNL_ATTRIBUTION_FAST01.md'), [
  '# RG_PNL_ATTRIBUTION_FAST01: PnL Attribution + Recon Contract', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`,
  `CHECKS: ${checks.length}`, `VIOLATIONS: ${failed.length}`, '',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_pnl_attribution_fast01.json'), {
  schema_version: '1.0.0', gate_id: 'RG_PNL_ATTRIBUTION_FAST01', status, reason_code, run_id: RUN_ID, checks_total: checks.length, violations: failed.length, checks, failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_pnl_attribution_fast01 — ${reason_code}`);
if (failed.length > 0) for (const f of failed) console.log(`  VIOLATION: ${f.check}: ${f.detail}`);
process.exit(status === 'PASS' ? 0 : 1);
