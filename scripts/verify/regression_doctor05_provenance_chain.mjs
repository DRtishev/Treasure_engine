/**
 * regression_doctor05_provenance_chain.mjs — RG_DOCTOR05
 *
 * Verifies provenance.mjs implements chain linking (G-10).
 * Gate ID: RG_DOCTOR05
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_DOCTOR05';
const NEXT_ACTION = 'npm run -s ops:doctor';
const violations = [];

// Check provenance.mjs has chain linking
const provPath = path.join(ROOT, 'scripts/lib/provenance.mjs');
if (!fs.existsSync(provPath)) {
  violations.push({ path: 'scripts/lib/provenance.mjs', detail: 'FILE_NOT_FOUND' });
} else {
  const src = fs.readFileSync(provPath, 'utf8');

  if (!src.includes('chain_parent')) {
    violations.push({ path: 'scripts/lib/provenance.mjs', detail: 'missing chain_parent field' });
  }
  if (!src.includes('chain_depth')) {
    violations.push({ path: 'scripts/lib/provenance.mjs', detail: 'missing chain_depth field' });
  }
  if (!src.includes('chain_integrity')) {
    violations.push({ path: 'scripts/lib/provenance.mjs', detail: 'missing chain_integrity field' });
  }
  if (!src.includes('findPreviousDoctorRun')) {
    violations.push({ path: 'scripts/lib/provenance.mjs', detail: 'missing findPreviousDoctorRun function' });
  }
}

// Check doctor_v2.mjs calls chain linking
const doctorPath = path.join(ROOT, 'scripts/ops/doctor_v2.mjs');
if (fs.existsSync(doctorPath)) {
  const src = fs.readFileSync(doctorPath, 'utf8');
  if (!src.includes('provenance_chain')) {
    violations.push({ path: 'scripts/ops/doctor_v2.mjs', detail: 'provenance_chain not surfaced in output' });
  }
  if (!src.includes('findPreviousDoctorRun')) {
    violations.push({ path: 'scripts/ops/doctor_v2.mjs', detail: 'findPreviousDoctorRun not called' });
  }
}

const status = violations.length === 0 ? 'PASS' : 'FAIL';
const reason_code = violations.length === 0 ? 'NONE' : 'RG_DOCTOR05_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_DOCTOR05.md'), [
  '# REGRESSION_DOCTOR05.md — Provenance chain linking', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, `VIOLATIONS: ${violations.length}`, '',
  '## VIOLATIONS', violations.length === 0 ? '- NONE' : violations.map((v) => `- ${v.path}: ${v.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_doctor05_provenance_chain.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION, violations,
});

console.log(`[${status}] regression_doctor05_provenance_chain — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
