/**
 * regression_policy01_kernel_valid.mjs — RG_POLICY01
 *
 * Validates specs/policy_kernel.json: schema, modes match VALID_MODES, scoreboard.
 * Gate ID: RG_POLICY01 · Wired: verify:doctor:policy
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { loadKernel, validateKernel } from '../gov/policy_engine.mjs';
import { VALID_MODES } from '../ops/event_schema_v1.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_POLICY01';
const NEXT_ACTION = 'npm run -s verify:doctor:policy';
const violations = [];

try {
  const kernel = loadKernel();
  const r = validateKernel(kernel);
  for (const e of r.errors) violations.push({ path: 'specs/policy_kernel.json', detail: e });
  const km = Object.keys(kernel.modes).sort();
  const sm = [...VALID_MODES].sort();
  if (JSON.stringify(km) !== JSON.stringify(sm))
    violations.push({ path: 'specs/policy_kernel.json', detail: `modes mismatch: kernel=[${km}] schema=[${sm}]` });
} catch (e) {
  violations.push({ path: 'specs/policy_kernel.json', detail: `load failed: ${e.message}` });
}

const status = violations.length === 0 ? 'PASS' : 'FAIL';
const reason_code = violations.length === 0 ? 'NONE' : 'RG_POLICY01_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_POLICY01.md'), [
  '# REGRESSION_POLICY01.md — Kernel validation', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, `VIOLATIONS: ${violations.length}`, '',
  '## VIOLATIONS', violations.length === 0 ? '- NONE' : violations.map((v) => `- ${v.path}: ${v.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_policy01_kernel_valid.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION, violations,
});

console.log(`[${status}] regression_policy01_kernel_valid — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
