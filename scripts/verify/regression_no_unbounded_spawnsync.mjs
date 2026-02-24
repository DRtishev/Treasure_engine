import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:mega:proof:x2';
fs.mkdirSync(MANUAL, { recursive: true });

const executorDir = path.join(ROOT, 'scripts/executor');
const allowlist = new Set(['scripts/executor/spawn_bounded.mjs']);
const bad = [];

for (const name of fs.readdirSync(executorDir).sort()) {
  if (!name.endsWith('.mjs')) continue;
  const rel = `scripts/executor/${name}`;
  if (allowlist.has(rel)) continue;
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  if (/spawnSync\(/.test(src)) bad.push(rel);
}

const status = bad.length ? 'BLOCKED' : 'PASS';
const reason_code = bad.length ? 'TO01' : 'NONE';
writeMd(path.join(EXEC_DIR, 'REGRESSION_NO_UNBOUNDED_SPAWNSYNC.md'), `# REGRESSION_NO_UNBOUNDED_SPAWNSYNC.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${bad.map((x) => `- unbounded: ${x}`).join('\n') || '- none'}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_no_unbounded_spawnsync.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  allowlist: [...allowlist],
  scanned_dir: 'scripts/executor',
  unbounded_files: bad,
});
console.log(`[${status}] regression_no_unbounded_spawnsync — ${reason_code}`);
process.exit(bad.length ? 1 : 0);
