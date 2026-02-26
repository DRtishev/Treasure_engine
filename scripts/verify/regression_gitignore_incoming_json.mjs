import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:mega:proof:x2';

fs.mkdirSync(MANUAL, { recursive: true });

const gitignorePath = path.join(ROOT, '.gitignore');
const src = fs.readFileSync(gitignorePath, 'utf8');
const lines = src.split(/\r?\n/).map((line) => line.trim());

const required = [
  'artifacts/incoming/*.json',
  'artifacts/incoming/*.lock.json',
  'artifacts/incoming/*.raw.json',
];

const checks = {
  ...Object.fromEntries(required.map((rule) => [rule, lines.includes(rule)])),
  no_global_lock_json: !lines.includes('*.lock.json'),
  no_global_raw_json: !lines.includes('*.raw.json'),
};
const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_GIT01';

writeMd(
  path.join(EXEC_DIR, 'REGRESSION_GITIGNORE_INCOMING_JSON.md'),
  `# REGRESSION_GITIGNORE_INCOMING_JSON.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks)
    .map(([k, v]) => `- has_rule_${k}: ${v}`)
    .join('\n')}\n`,
);

writeJsonDeterministic(path.join(MANUAL, 'regression_gitignore_incoming_json.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
});

console.log(`[${status}] regression_gitignore_incoming_json — ${reason_code}`);
process.exit(ok ? 0 : 1);
