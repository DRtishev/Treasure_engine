/**
 * regression_doctor02_no_net.mjs — RG_DOCTOR02
 *
 * Verifies doctor.mjs self-sets TREASURE_NET_KILL=1 and has no network imports.
 * Gate ID: RG_DOCTOR02 · Wired: verify:doctor:policy
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_DOCTOR02';
const NEXT_ACTION = 'npm run -s verify:doctor:policy';
const DOCTOR = path.join(ROOT, 'scripts/ops/doctor.mjs');
const violations = [];

if (!fs.existsSync(DOCTOR)) {
  violations.push({ path: 'scripts/ops/doctor.mjs', detail: 'FILE_NOT_FOUND' });
} else {
  const src = fs.readFileSync(DOCTOR, 'utf8');
  if (!src.includes("process.env.TREASURE_NET_KILL = '1'"))
    violations.push({ path: 'scripts/ops/doctor.mjs', detail: 'missing TREASURE_NET_KILL=1' });
  if (!src.includes('net_kill_preload'))
    violations.push({ path: 'scripts/ops/doctor.mjs', detail: 'missing net_kill_preload' });
  for (const p of ["from 'ws'", 'from "ws"', "from 'undici'", "from 'node:http'", "from 'node:https'", "from 'node:net'"]) {
    if (src.includes(p)) violations.push({ path: 'scripts/ops/doctor.mjs', detail: `forbidden import: ${p}` });
  }
}

const status = violations.length === 0 ? 'PASS' : 'FAIL';
const reason_code = violations.length === 0 ? 'NONE' : 'RG_DOCTOR02_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_DOCTOR02.md'), [
  '# REGRESSION_DOCTOR02.md — Doctor no-net', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, `VIOLATIONS: ${violations.length}`, '',
  '## VIOLATIONS', violations.length === 0 ? '- NONE' : violations.map((v) => `- ${v.path}: ${v.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_doctor02_no_net.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION, violations,
});

console.log(`[${status}] regression_doctor02_no_net — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
