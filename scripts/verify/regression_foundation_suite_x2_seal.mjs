import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { runBounded } from '../executor/spawn_bounded.mjs';
import { RUN_ID, writeMd, stableEvidenceNormalize } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:mega:proof:x2';
fs.mkdirSync(MANUAL, { recursive: true });

const cmds = [
  'npm run -s verify:regression:no-unbounded-spawn',
  'npm run -s verify:regression:node22-wrapper-timeout',
];

function digest() {
  const src = [
    'reports/evidence/EXECUTOR/REGRESSION_NO_UNBOUNDED_SPAWNSYNC.md',
    'reports/evidence/EXECUTOR/REGRESSION_NODE22_WRAPPER_TIMEOUT.md',
  ];
  const payload = src.map((rel) => {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) return `${rel}:MISSING`;
    return `${rel}:${crypto.createHash('sha256').update(stableEvidenceNormalize(fs.readFileSync(abs, 'utf8'))).digest('hex')}`;
  }).join('\n');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function runOnce() {
  for (const cmd of cmds) {
    const r = runBounded(cmd, { cwd: ROOT, env: process.env, maxBuffer: 16 * 1024 * 1024 });
    if (r.ec !== 0) return { ec: r.ec, cmd };
  }
  return { ec: 0, cmd: 'ALL' };
}

const a = runOnce();
const d1 = a.ec === 0 ? digest() : 'NA';
const b = runOnce();
const d2 = b.ec === 0 ? digest() : 'NA';
const same = a.ec === 0 && b.ec === 0 && d1 === d2;
const status = same ? 'PASS' : 'FAIL';
const reason_code = same ? 'NONE' : (a.ec !== 0 || b.ec !== 0 ? 'EC01' : 'ND01');
writeMd(path.join(EXEC_DIR, 'REGRESSION_FOUNDATION_SUITE_X2_SEAL.md'), `# REGRESSION_FOUNDATION_SUITE_X2_SEAL.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- run1_ec: ${a.ec}\n- run2_ec: ${b.ec}\n- digest_run1: ${d1}\n- digest_run2: ${d2}\n- stable_match: ${same}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_foundation_suite_x2_seal.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, run1_ec:a.ec, run2_ec:b.ec, digest_run1:d1, digest_run2:d2, stable_match:same });
console.log(`[${status}] regression_foundation_suite_x2_seal — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
