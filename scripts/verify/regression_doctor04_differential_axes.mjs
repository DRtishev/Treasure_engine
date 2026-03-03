/**
 * regression_doctor04_differential_axes.mjs — RG_DOCTOR04
 *
 * Verifies doctor_v2.mjs implements 5-axis differential (G-08).
 * Gate ID: RG_DOCTOR04
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_DOCTOR04';
const NEXT_ACTION = 'npm run -s ops:doctor';
const violations = [];

const doctorPath = path.join(ROOT, 'scripts/ops/doctor_v2.mjs');
if (!fs.existsSync(doctorPath)) {
  violations.push({ path: 'scripts/ops/doctor_v2.mjs', detail: 'FILE_NOT_FOUND' });
} else {
  const src = fs.readFileSync(doctorPath, 'utf8');

  // Check for 5 differential axes
  const axes = ['INFRA', 'DETERMINISM', 'POLICY', 'CHAOS', 'REGRESSION'];
  for (const axis of axes) {
    if (!src.includes(`'${axis}'`) && !src.includes(`"${axis}"`)) {
      violations.push({
        path: 'scripts/ops/doctor_v2.mjs',
        detail: `differential axis "${axis}" not found`,
      });
    }
  }

  // Check for differential output in DOCTOR.json
  if (!src.includes('differential')) {
    violations.push({ path: 'scripts/ops/doctor_v2.mjs', detail: 'no differential in output' });
  }

  // Check for differential_clean scoreboard entry
  if (!src.includes('differential_clean')) {
    violations.push({ path: 'scripts/ops/doctor_v2.mjs', detail: 'differential_clean not in scoreboard' });
  }

  // Check for net_direction
  if (!src.includes('net_direction')) {
    violations.push({ path: 'scripts/ops/doctor_v2.mjs', detail: 'net_direction not computed' });
  }

  // Check for degraded_axes
  if (!src.includes('degraded_axes')) {
    violations.push({ path: 'scripts/ops/doctor_v2.mjs', detail: 'degraded_axes not tracked' });
  }
}

const status = violations.length === 0 ? 'PASS' : 'FAIL';
const reason_code = violations.length === 0 ? 'NONE' : 'RG_DOCTOR04_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_DOCTOR04.md'), [
  '# REGRESSION_DOCTOR04.md — Differential 5-axis contract', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, `VIOLATIONS: ${violations.length}`, '',
  '## VIOLATIONS', violations.length === 0 ? '- NONE' : violations.map((v) => `- ${v.path}: ${v.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_doctor04_differential_axes.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION, violations,
});

console.log(`[${status}] regression_doctor04_differential_axes — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
