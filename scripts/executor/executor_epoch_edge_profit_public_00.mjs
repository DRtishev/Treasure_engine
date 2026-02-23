import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR');
const MANUAL_DIR = path.join(EXEC_DIR, 'gates', 'manual');
const OUT_MD = path.join(EXEC_DIR, 'EPOCH_EDGE_PROFIT_PUBLIC_00.md');
const OUT_JSON = path.join(MANUAL_DIR, 'epoch_edge_profit_public_00.json');
const NEXT_ACTION = 'npm run -s epoch:edge:profit:public:00:x2';
const LOCK_PATH = path.join(ROOT, 'artifacts', 'incoming', 'real_public_market.lock.md');

fs.mkdirSync(MANUAL_DIR, { recursive: true });

function run(cmd) {
  const wrapped = `source ~/.nvm/nvm.sh && nvm install 22.22.0 && nvm use 22.22.0 >/dev/null && ${cmd}`;
  const r = spawnSync('bash', ['-lc', wrapped], { cwd: ROOT, encoding: 'utf8', env: process.env, maxBuffer: 64 * 1024 * 1024 });
  return { cmd, ec: Number.isInteger(r.status) ? r.status : 1 };
}

const acquireMode = fs.existsSync(LOCK_PATH) ? 'LOCK_FIRST' : 'NETWORK';
const acquireCmd = acquireMode === 'NETWORK'
  ? 'ENABLE_NETWORK=1 PROVIDER_ALLOWLIST=binance,bybit,okx,kraken npm run -s edge:profit:00:acquire:public'
  : 'ACQUIRE_IF_MISSING=1 npm run -s edge:profit:00:acquire:public';

const steps = [
  'npm run -s executor:clean:baseline',
  'npm run -s verify:env:authority',
  'npm run -s epoch:mega:proof:x2',
  'npm run -s verify:system:lockdown',
  acquireCmd,
  'npm run -s edge:profit:00:import:csv',
  'npm run -s executor:run:chain',
  'npm run -s verify:regression:no-network-in-verify-profit',
  'npm run -s edge:profit:00:doctor',
];

const records = [];
let status = 'PASS';
let reasonCode = 'NONE';
let message = 'Public epoch completed.';
for (const cmd of steps) {
  const rec = run(cmd);
  records.push(rec);
  if (rec.ec !== 0) {
    status = 'BLOCKED';
    reasonCode = 'EC01';
    message = `Command failed: ${cmd}`;
    break;
  }
}

writeMd(OUT_MD, `# EPOCH_EDGE_PROFIT_PUBLIC_00.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- ACQUIRE_MODE: ${acquireMode}\n\n## COMMANDS\n\n${records.map((r) => `- ${r.cmd} | ec=${r.ec}`).join('\n') || '- NONE'}\n`);

writeJsonDeterministic(OUT_JSON, {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message,
  next_action: NEXT_ACTION,
  acquire_mode: acquireMode,
  commands: records,
});

console.log(`[${status}] executor_epoch_edge_profit_public_00 — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
