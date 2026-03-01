/**
 * regression_rg_lane06_static_nonempty.mjs — RG_LANE06
 *
 * Verifies data_readiness_seal.mjs rejects empty STATIC dirs.
 * Scans source for directory non-empty guard pattern.
 *
 * Gate ID : RG_LANE06
 * Wired   : verify:doctor:policy
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_LANE06';
const NEXT_ACTION = 'npm run -s verify:doctor:policy';
const TARGET_REL = 'scripts/verify/data_readiness_seal.mjs';

const violations = [];

if (!fs.existsSync(path.join(ROOT, TARGET_REL))) {
  violations.push({ path: TARGET_REL, detail: 'FILE_NOT_FOUND' });
} else {
  const src = fs.readFileSync(path.join(ROOT, TARGET_REL), 'utf8');
  if (!src.includes('.isDirectory()') || !src.includes('readdirSync(')) {
    violations.push({ path: TARGET_REL, detail: 'STATIC evaluator missing dir non-empty check (isDirectory + readdirSync)' });
  }
}

const status = violations.length === 0 ? 'PASS' : 'FAIL';
const reason_code = violations.length === 0 ? 'NONE' : 'RG_LANE06_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_RG_LANE06.md'), [
  '# REGRESSION_RG_LANE06.md — Static lane non-empty guard', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, `VIOLATIONS: ${violations.length}`, '',
  '## VIOLATIONS',
  violations.length === 0 ? '- NONE' : violations.map((v) => `- ${v.path}: ${v.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_rg_lane06_static_nonempty.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code,
  run_id: RUN_ID, next_action: NEXT_ACTION, violations,
});

console.log(`[${status}] regression_rg_lane06_static_nonempty — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
