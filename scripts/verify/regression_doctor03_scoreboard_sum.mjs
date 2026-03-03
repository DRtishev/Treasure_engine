/**
 * regression_doctor03_scoreboard_sum.mjs — RG_DOCTOR03
 *
 * Verifies scoreboard weights in doctor_manifest.json sum to exactly 100.
 * Gate ID: RG_DOCTOR03
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_DOCTOR03';
const NEXT_ACTION = 'npm run -s ops:doctor';
const violations = [];

const manifestPath = path.join(ROOT, 'specs/doctor_manifest.json');
if (!fs.existsSync(manifestPath)) {
  violations.push({ path: 'specs/doctor_manifest.json', detail: 'FILE_NOT_FOUND' });
} else {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const scoreboard = manifest.scoreboard_v2 || {};
  const entries = Object.entries(scoreboard);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);

  if (total !== 100) {
    violations.push({
      path: 'specs/doctor_manifest.json',
      detail: `scoreboard_v2 weights sum to ${total}, expected 100`,
    });
  }

  if (entries.length < 12) {
    violations.push({
      path: 'specs/doctor_manifest.json',
      detail: `scoreboard_v2 has ${entries.length} entries, expected at least 12`,
    });
  }

  // Also verify doctor_v2.mjs uses matching weights
  const doctorPath = path.join(ROOT, 'scripts/ops/doctor_v2.mjs');
  if (fs.existsSync(doctorPath)) {
    const src = fs.readFileSync(doctorPath, 'utf8');
    for (const [key, weight] of entries) {
      // Check that the key appears in score() calls
      if (!src.includes(`'${key}'`) && !src.includes(`"${key}"`)) {
        violations.push({
          path: 'scripts/ops/doctor_v2.mjs',
          detail: `scoreboard key "${key}" not found in doctor_v2.mjs`,
        });
      }
    }
  }
}

const status = violations.length === 0 ? 'PASS' : 'FAIL';
const reason_code = violations.length === 0 ? 'NONE' : 'RG_DOCTOR03_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_DOCTOR03.md'), [
  '# REGRESSION_DOCTOR03.md — Scoreboard sum = 100', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, `VIOLATIONS: ${violations.length}`, '',
  '## VIOLATIONS', violations.length === 0 ? '- NONE' : violations.map((v) => `- ${v.path}: ${v.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_doctor03_scoreboard_sum.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION, violations,
});

console.log(`[${status}] regression_doctor03_scoreboard_sum — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
