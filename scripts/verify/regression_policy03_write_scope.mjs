/**
 * regression_policy03_write_scope.mjs — RG_POLICY03
 *
 * Scans reports/evidence/ for non-exempt entries.
 * Gate ID: RG_POLICY03 · Wired: verify:doctor:policy
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { isLegacyExempt } from '../gov/policy_engine.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_POLICY03';
const NEXT_ACTION = 'npm run -s verify:doctor:policy';
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence');
const violations = [];

if (fs.existsSync(EVIDENCE_DIR)) {
  for (const ent of fs.readdirSync(EVIDENCE_DIR, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const name = ent.name;
    if (name === 'EXECUTOR' || name.startsWith('EPOCH-') || isLegacyExempt(name)) continue;
    violations.push({ path: `reports/evidence/${name}`, detail: 'not EXECUTOR, not EPOCH-*, not legacy-exempt' });
  }
}

const status = violations.length === 0 ? 'PASS' : 'FAIL';
const reason_code = violations.length === 0 ? 'NONE' : 'RG_POLICY03_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_POLICY03.md'), [
  '# REGRESSION_POLICY03.md — Write scope', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, `VIOLATIONS: ${violations.length}`, '',
  '## VIOLATIONS', violations.length === 0 ? '- NONE' : violations.map((v) => `- ${v.path}: ${v.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_policy03_write_scope.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION, violations,
});

console.log(`[${status}] regression_policy03_write_scope — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
