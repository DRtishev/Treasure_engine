import fs from 'node:fs';
import path from 'node:path';
import { runBounded } from './spawn_bounded.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:foundation:seal';
fs.mkdirSync(MANUAL, { recursive: true });

const steps = [
  'npm run -s epoch:mega:proof:x2',
  'npm run -s verify:regression:no-network-in-verify-profit',
  'npm run -s verify:regression:no-unbounded-spawn',
  'npm run -s verify:regression:node22-wrapper-timeout',
  'npm run -s verify:regression:mega-proof-x2-stability-contract',
  'npm run -s verify:regression:foundation-suite-x2-seal',
  'npm run -s verify:regression:bounded-kill-tree',
  'npm run -s verify:regression:evidence-bundle-deterministic-x2',
  'npm run -s verify:profit:foundation',
];

const records = [];
let status = 'PASS';
let reason_code = 'NONE';
for (const cmd of steps) {
  const r = runBounded(cmd, { cwd: ROOT, env: process.env, maxBuffer: 32 * 1024 * 1024 });
  records.push({ cmd, ec: r.ec, timedOut: Boolean(r.timedOut), timeout_ms: r.timeout_ms, startedAt: r.startedAt, completedAt: r.completedAt });
  if (r.ec !== 0) {
    status = 'BLOCKED';
    reason_code = r.timedOut ? 'TO01' : 'EC01';
    break;
  }
}

writeMd(path.join(EXEC_DIR, 'FOUNDATION_SEAL.md'), `# FOUNDATION_SEAL.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n## STEPS\n${records.map((r, i) => `- step_${i + 1}: ${r.cmd} | ec=${r.ec} | timedOut=${r.timedOut} | timeout_ms=${r.timeout_ms}\n  STARTED_AT: ${r.startedAt}\n  COMPLETED_AT: ${r.completedAt}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'foundation_seal.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, steps: records });
console.log(`[${status}] executor_epoch_foundation_seal — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
