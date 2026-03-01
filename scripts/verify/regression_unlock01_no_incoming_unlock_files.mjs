/**
 * regression_unlock01_no_incoming_unlock_files.mjs — RG_UNLOCK01_NO_INCOMING_UNLOCK_FILES
 *
 * Gate: artifacts/incoming must contain no active unlock markers.
 *       Fail if ALLOW_NETWORK or APPLY_AUTOPILOT are present.
 *
 * Rationale: CERT mode is offline and non-destructive by default.
 *            Residual unlock files indicate unsafe operator state that could
 *            allow network access or destructive apply during certification.
 *
 * Surface: OFFLINE_AUTHORITY
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:fast';
const INCOMING = path.join(ROOT, 'artifacts', 'incoming');

const UNLOCK_FILES = [
  { name: 'ALLOW_NETWORK', reason: 'network unlock — must be removed after toolchain acquire' },
  { name: 'APPLY_AUTOPILOT', reason: 'apply unlock — must be removed after apply action' },
];

const checks = [];
const found = [];

for (const { name, reason } of UNLOCK_FILES) {
  const p = path.join(INCOMING, name);
  const exists = fs.existsSync(p);
  if (exists) found.push({ name, reason });
  checks.push({
    check: `no_${name.toLowerCase()}`,
    pass: !exists,
    detail: exists
      ? `UNLOCK_RESIDUE: ${path.relative(ROOT, p)} — ${reason}`
      : `absent — OK`,
  });
}

const status = checks.every((c) => c.pass) ? 'PASS' : 'FAIL';
const reason_code = status === 'PASS' ? 'NONE' : 'RG_UNLOCK01';

writeMd(path.join(EXEC, 'REGRESSION_UNLOCK01.md'), [
  '# REGRESSION_UNLOCK01.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## UNLOCK_FILES_CHECKED',
  UNLOCK_FILES.map((u) => `- ${u.name}: ${u.reason}`).join('\n'), '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FOUND_UNLOCK_RESIDUE',
  found.length === 0
    ? '- NONE'
    : found.map((f) => `- ${f.name}: ${f.reason}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_unlock01.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_UNLOCK01_NO_INCOMING_UNLOCK_FILES',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  found_unlock_files: found.map((f) => f.name),
});

console.log(`[${status}] regression_unlock01_no_incoming_unlock_files — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
