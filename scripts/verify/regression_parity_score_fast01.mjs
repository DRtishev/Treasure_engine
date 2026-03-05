/**
 * regression_parity_score_fast01.mjs — RG_PARITY_SCORE_FAST01
 *
 * RADICAL-LITE R2: Verifies fill_quality.mjs and parity_score.mjs exist and export correctly.
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
  // Check 1: fill_quality.mjs exists
  const fqPath = path.join(ROOT, 'core/edge/fill_quality.mjs');
  const p1 = fs.existsSync(fqPath);
  checks.push({ check: 'fill_quality_exists', pass: p1, detail: p1 ? 'OK' : 'FAIL: file missing' });

  if (p1) {
    const fqSrc = fs.readFileSync(fqPath, 'utf8');
    // Check 2: exports evaluateFillQuality
    const p2 = fqSrc.includes('export function evaluateFillQuality');
    checks.push({ check: 'evaluateFillQuality_exported', pass: p2, detail: p2 ? 'OK' : 'FAIL' });

    // Check 3: exports evaluateBatchQuality
    const p3 = fqSrc.includes('export function evaluateBatchQuality');
    checks.push({ check: 'evaluateBatchQuality_exported', pass: p3, detail: p3 ? 'OK' : 'FAIL' });
  }

  // Check 4: parity_score.mjs exists
  const psPath = path.join(ROOT, 'core/recon/parity_score.mjs');
  const p4 = fs.existsSync(psPath);
  checks.push({ check: 'parity_score_exists', pass: p4, detail: p4 ? 'OK' : 'FAIL: file missing' });

  if (p4) {
    const psSrc = fs.readFileSync(psPath, 'utf8');
    // Check 5: exports computeParityScore
    const p5 = psSrc.includes('export function computeParityScore');
    checks.push({ check: 'computeParityScore_exported', pass: p5, detail: p5 ? 'OK' : 'FAIL' });
  }

} catch (err) {
  checks.push({ check: 'read_source', pass: false, detail: `FAIL: ${err.message}` });
}

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_PARITY_SCORE_FAST01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_PARITY_SCORE_FAST01.md'), [
  '# RG_PARITY_SCORE_FAST01: Fill Quality + Parity Score Contract', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`,
  `CHECKS: ${checks.length}`, `VIOLATIONS: ${failed.length}`, '',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_parity_score_fast01.json'), {
  schema_version: '1.0.0', gate_id: 'RG_PARITY_SCORE_FAST01', status, reason_code, run_id: RUN_ID, checks_total: checks.length, violations: failed.length, checks, failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_parity_score_fast01 — ${reason_code}`);
if (failed.length > 0) for (const f of failed) console.log(`  VIOLATION: ${f.check}: ${f.detail}`);
process.exit(status === 'PASS' ? 0 : 1);
