import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:mega:proof:x2';
fs.mkdirSync(MANUAL, { recursive: true });

const files = [
  'scripts/executor/executor_run_chain.mjs',
  'scripts/executor/executor_epoch_edge_profit_public_00.mjs',
  'scripts/executor/executor_epoch_edge_profit_public_00_x2.mjs',
  'scripts/executor/executor_epoch_edge_profit_public_00_ladder.mjs',
  'scripts/executor/executor_mega_proof_x2.mjs',
  'scripts/edge/edge_lab/edge_profit_00_acquire_public_smoke.mjs',
];
const bad = [];
for (const rel of files) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  if (/spawnSync\(/.test(src) && !src.includes('runBounded(')) bad.push(rel);
}
const status = bad.length ? 'BLOCKED' : 'PASS';
const reason_code = bad.length ? 'TO01' : 'NONE';
writeMd(path.join(EXEC_DIR, 'REGRESSION_NO_UNBOUNDED_SPAWNSYNC.md'), `# REGRESSION_NO_UNBOUNDED_SPAWNSYNC.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${bad.map((x)=>`- unbounded: ${x}`).join('\n') || '- none'}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_no_unbounded_spawnsync.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, unbounded_files: bad });
console.log(`[${status}] regression_no_unbounded_spawnsync — ${reason_code}`);
process.exit(bad.length ? 1 : 0);
