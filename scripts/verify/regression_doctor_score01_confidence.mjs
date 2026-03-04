/**
 * regression_doctor_score01_confidence.mjs — RG_DOCTOR_SCORE01
 *
 * SPRINT-2 regression gate: Verifies that doctor_v2.mjs outputs
 * confidence_score in its scoreboard and evidence.
 *
 * Checks:
 *   1. doctor_v2.mjs contains `confidenceScore` variable
 *   2. doctor_v2.mjs writes `confidence_score` to DOCTOR.json
 *   3. doctor_v2.mjs emits confidence_score in DOCTOR_VERDICT event
 *   4. doctor_history.mjs exists and exports appendDoctorHistory
 *
 * Write-scope: reports/evidence/EXECUTOR/gates/manual/regression_doctor_score01.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:doctor-score01-confidence';
const checks = [];

const DOCTOR_PATH = path.join(ROOT, 'scripts/ops/doctor_v2.mjs');

if (!fs.existsSync(DOCTOR_PATH)) {
  checks.push({ check: 'doctor_v2_exists', pass: false, detail: 'FAIL: doctor_v2.mjs not found' });
} else {
  const src = fs.readFileSync(DOCTOR_PATH, 'utf8');

  // Check 1: confidenceScore variable
  const hasVar = /confidenceScore/.test(src);
  checks.push({
    check: 'has_confidenceScore_var',
    pass: hasVar,
    detail: hasVar ? 'OK: confidenceScore variable present' : 'FAIL: confidenceScore not found',
  });

  // Check 2: writes confidence_score to DOCTOR.json
  const writesScore = /confidence_score.*confidenceScore|confidence_score:/.test(src);
  checks.push({
    check: 'writes_confidence_score',
    pass: writesScore,
    detail: writesScore ? 'OK: confidence_score written to evidence' : 'FAIL: confidence_score not written',
  });

  // Check 3: emits confidence_score in DOCTOR_VERDICT event attrs
  // Both DOCTOR_VERDICT and confidence_score must exist in the bus.append block
  const hasDoctorVerdict = /event:\s*'DOCTOR_VERDICT'/.test(src);
  const hasConfInAttrs = /attrs:.*confidence_score/.test(src);
  const emitsInEvent = hasDoctorVerdict && hasConfInAttrs;
  checks.push({
    check: 'emits_confidence_in_verdict',
    pass: emitsInEvent,
    detail: emitsInEvent ? 'OK: confidence_score emitted in DOCTOR_VERDICT event' : 'FAIL: confidence_score not in DOCTOR_VERDICT event attrs',
  });
}

// Check 4: doctor_history.mjs exists
const HISTORY_PATH = path.join(ROOT, 'scripts/ops/doctor_history.mjs');
const historyExists = fs.existsSync(HISTORY_PATH);
checks.push({
  check: 'doctor_history_exists',
  pass: historyExists,
  detail: historyExists ? 'OK: doctor_history.mjs exists' : 'FAIL: doctor_history.mjs not found',
});

if (historyExists) {
  const histSrc = fs.readFileSync(HISTORY_PATH, 'utf8');
  const hasExport = /export\s+function\s+appendDoctorHistory/.test(histSrc);
  checks.push({
    check: 'doctor_history_exports_append',
    pass: hasExport,
    detail: hasExport ? 'OK: appendDoctorHistory exported' : 'FAIL: appendDoctorHistory not exported',
  });
}

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_DOCTOR_SCORE01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_DOCTOR_SCORE01.md'), [
  '# RG_DOCTOR_SCORE01: Doctor Confidence Score', '',
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

writeJsonDeterministic(path.join(MANUAL, 'regression_doctor_score01.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_DOCTOR_SCORE01',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_doctor_score01_confidence — ${reason_code}`);
if (failed.length > 0) for (const f of failed) console.log(`  VIOLATION: ${f.check}: ${f.detail}`);
process.exit(status === 'PASS' ? 0 : 1);
