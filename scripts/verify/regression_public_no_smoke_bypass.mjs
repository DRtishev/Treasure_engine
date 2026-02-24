import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const REG_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'registry');
const MANUAL_DIR = path.join(REG_DIR, 'gates', 'manual');
const NEXT_ACTION = 'npm run -s epoch:edge:profit:public:00:x2:node22';
const target = path.join(ROOT, 'scripts', 'executor', 'executor_epoch_edge_profit_public_00.mjs');

fs.mkdirSync(MANUAL_DIR, { recursive: true });

const raw = fs.readFileSync(target, 'utf8');
const hasGuardedAcquire = raw.includes("'GUARDED_ACQUIRE'") && raw.includes('function guardedAcquireCommand()') && raw.includes('SMK_ORDER01');
const stepsMatch = raw.match(/const steps = \[([\s\S]*?)\];/m);
const stepsRaw = stepsMatch?.[1] || '';
const hasDirectAcquireStep = /edge:profit:00:acquire:public(?!:smoke|:diag)/.test(stepsRaw);

let status = 'PASS';
let reasonCode = 'NONE';
let message = 'No smoke bypass detected in public epoch graph.';
if (!hasGuardedAcquire || hasDirectAcquireStep) {
  status = 'FAIL';
  reasonCode = 'SMK_ORDER01';
  message = 'Bypass detected: acquire callsite not restricted to guarded smoke route.';
}

writeMd(path.join(REG_DIR, 'REGRESSION_PUBLIC_NO_SMOKE_BYPASS.md'), `# REGRESSION_PUBLIC_NO_SMOKE_BYPASS.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- file: scripts/executor/executor_epoch_edge_profit_public_00.mjs\n- has_guarded_acquire: ${hasGuardedAcquire}\n- has_direct_acquire_step: ${hasDirectAcquireStep}\n`);

writeJsonDeterministic(path.join(MANUAL_DIR, 'regression_public_no_smoke_bypass.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message,
  next_action: NEXT_ACTION,
  file: 'scripts/executor/executor_epoch_edge_profit_public_00.mjs',
  has_guarded_acquire: hasGuardedAcquire,
  has_direct_acquire_step: hasDirectAcquireStep,
});

console.log(`[${status}] regression_public_no_smoke_bypass — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
