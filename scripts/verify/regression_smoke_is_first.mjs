import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const REG_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'registry');
const MANUAL_DIR = path.join(REG_DIR, 'gates', 'manual');
const NEXT_ACTION = 'npm run -s epoch:edge:profit:public:00:x2:node22';
const epochScript = path.join(ROOT, 'scripts', 'executor', 'executor_epoch_edge_profit_public_00.mjs');

fs.mkdirSync(MANUAL_DIR, { recursive: true });

const raw = fs.readFileSync(epochScript, 'utf8');
const smokeNeedle = "'npm run -s edge:profit:00:acquire:public:smoke'";
const acquireNeedle = "'GUARDED_ACQUIRE'";
const stepsMatch = raw.match(/const steps = \[([\s\S]*?)\];/m);
const stepsRaw = stepsMatch?.[1] || '';
const smokePos = stepsRaw.indexOf(smokeNeedle);
const acquirePos = stepsRaw.indexOf(acquireNeedle);

let status = 'PASS';
let reasonCode = 'NONE';
const smokeScript = fs.readFileSync(path.join(ROOT, 'scripts', 'edge', 'edge_lab', 'edge_profit_00_acquire_public_smoke.mjs'), 'utf8');
const hasOfflineReplay = smokeScript.includes('smoke_mode: OFFLINE_REPLAY');
let message = 'Smoke gate is ordered before guarded acquire in public epoch.';
if (smokePos < 0 || acquirePos < 0 || smokePos > acquirePos) {
  status = 'FAIL';
  reasonCode = 'SMK_ORDER01';
  message = 'Ordering violation: acquire can run before smoke gate.';
} else if (!hasOfflineReplay) {
  status = 'FAIL';
  reasonCode = 'SMK01';
  message = 'Smoke script missing OFFLINE_REPLAY lock-first mode.';
}

writeMd(path.join(REG_DIR, 'REGRESSION_SMOKE_IS_FIRST.md'), `# REGRESSION_SMOKE_IS_FIRST.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- script: scripts/executor/executor_epoch_edge_profit_public_00.mjs\n- smoke_pos: ${smokePos}\n- acquire_pos: ${acquirePos}\n- has_offline_replay: ${hasOfflineReplay}\n`);

writeJsonDeterministic(path.join(MANUAL_DIR, 'regression_smoke_is_first.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message,
  next_action: NEXT_ACTION,
  script: 'scripts/executor/executor_epoch_edge_profit_public_00.mjs',
  smoke_pos: smokePos,
  acquire_pos: acquirePos,
  has_offline_replay: hasOfflineReplay,
});

console.log(`[${status}] regression_smoke_is_first — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
