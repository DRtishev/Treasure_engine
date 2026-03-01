/**
 * regression_doctor01_output_stable_x2.mjs — RG_DOCTOR01
 *
 * Verifies doctor.mjs contains x2 determinism logic.
 * Gate ID: RG_DOCTOR01 · Wired: verify:doctor:policy
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_DOCTOR01';
const NEXT_ACTION = 'npm run -s verify:doctor:policy';
const DOCTOR = path.join(ROOT, 'scripts/ops/doctor.mjs');
const violations = [];

if (!fs.existsSync(DOCTOR)) {
  violations.push({ path: 'scripts/ops/doctor.mjs', detail: 'FILE_NOT_FOUND' });
} else {
  const src = fs.readFileSync(DOCTOR, 'utf8');
  if ((src.match(/ops:life/g) || []).length < 2)
    violations.push({ path: 'scripts/ops/doctor.mjs', detail: 'must run ops:life at least twice' });
  if (!src.includes('LIFE_SUMMARY.json'))
    violations.push({ path: 'scripts/ops/doctor.mjs', detail: 'must compare LIFE_SUMMARY.json' });
}

const status = violations.length === 0 ? 'PASS' : 'FAIL';
const reason_code = violations.length === 0 ? 'NONE' : 'RG_DOCTOR01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_DOCTOR01.md'), [
  '# REGRESSION_DOCTOR01.md — Doctor x2 contract', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, `VIOLATIONS: ${violations.length}`, '',
  '## VIOLATIONS', violations.length === 0 ? '- NONE' : violations.map((v) => `- ${v.path}: ${v.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_doctor01_output_stable_x2.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION, violations,
});

console.log(`[${status}] regression_doctor01_output_stable_x2 — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
