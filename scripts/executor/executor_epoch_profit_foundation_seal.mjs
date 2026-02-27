import fs from 'node:fs';
import path from 'node:path';
import { runBounded } from './spawn_bounded.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence', `EPOCH-PROFIT-FOUNDATION-${RUN_ID}`);
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';
fs.mkdirSync(MANUAL, { recursive: true });

const steps = [
  'npm run -s verify:profit:foundation',
];

const records = [];
let status = 'PASS';
let reason_code = 'NONE';

for (const [index, cmd] of steps.entries()) {
  const r = runBounded(cmd, { cwd: ROOT, env: process.env, maxBuffer: 32 * 1024 * 1024 });
  records.push({
    step_index: index + 1,
    cmd,
    ec: r.ec,
    timedOut: Boolean(r.timedOut),
    timeout_ms: r.timeout_ms,
  });
  if (r.ec !== 0) {
    status = r.ec === 2 ? 'NEEDS_DATA' : 'BLOCKED';
    reason_code = r.timedOut ? 'TO01' : `PROFIT_FOUNDATION_STEP_EC_${index + 1}`;
    break;
  }
}

writeMd(path.join(EXEC_DIR, 'PROFIT_FOUNDATION_SEAL.md'), `# PROFIT_FOUNDATION_SEAL.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n## STEPS\n${records.map((r) => `- step_${r.step_index}: ${r.cmd} | ec=${r.ec} | timedOut=${r.timedOut} | timeout_ms=${r.timeout_ms}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'profit_foundation_seal.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  steps: records,
});

console.log(`[${status}] executor_epoch_profit_foundation_seal — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : (status === 'NEEDS_DATA' ? 2 : 1));
