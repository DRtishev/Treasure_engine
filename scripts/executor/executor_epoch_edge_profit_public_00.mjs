import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { runBounded } from './spawn_bounded.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR');
const MANUAL_DIR = path.join(EXEC_DIR, 'gates', 'manual');
const OUT_MD = path.join(EXEC_DIR, 'EPOCH_EDGE_PROFIT_PUBLIC_00.md');
const OUT_JSON = path.join(MANUAL_DIR, 'epoch_edge_profit_public_00.json');
const NEXT_ACTION = 'npm run -s epoch:edge:profit:public:00:x2:node22';
const LOCK_PATH = path.join(ROOT, 'artifacts', 'incoming', 'real_public_market.lock.md');
const SMOKE_JSON = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'registry', 'gates', 'manual', 'public_smoke.json');

fs.mkdirSync(MANUAL_DIR, { recursive: true });

function run(cmd) {
  const r = runBounded(cmd, { cwd: ROOT, env: process.env, maxBuffer: 64 * 1024 * 1024 });
  return { cmd, ec: r.ec, timed_out: r.timedOut, timeout_ms: r.timeout_ms };
}

function readSmokeJson() {
  if (!fs.existsSync(SMOKE_JSON)) return null;
  try { return JSON.parse(fs.readFileSync(SMOKE_JSON, 'utf8')); } catch { return null; }
}

function readSmokeReason() {
  const j = readSmokeJson();
  if (!j) return 'SMK_ORDER01';
  return String(j.reason_code || 'SMK01');
}

const acquireMode = fs.existsSync(LOCK_PATH) ? 'LOCK_FIRST' : 'NETWORK';
const acquireCmd = acquireMode === 'NETWORK'
  ? 'ENABLE_NETWORK=1 PROVIDER_ALLOWLIST=binance,bybit,okx,kraken npm run -s edge:profit:00:acquire:public'
  : 'ACQUIRE_IF_MISSING=1 npm run -s edge:profit:00:acquire:public';

let smokePassed = false;
let smokeMode = 'UNKNOWN';
function guardedAcquireCommand() {
  if (!smokePassed) throw new Error('SMK_ORDER01');
  return acquireCmd;
}

const steps = [
  'npm run -s edge:profit:00:acquire:public:smoke',
  'npm run -s env:node22:bootstrap:gate',
  'npm run -s verify:regression:no-network-in-verify-profit',
  'ENABLE_NETWORK=1 PROVIDER_ALLOWLIST=binance,bybit,okx,kraken npm run -s edge:profit:00:acquire:public:diag',
  'npm run -s executor:clean:baseline',
  'npm run -s verify:env:authority',
  'npm run -s epoch:mega:proof:x2',
  'npm run -s verify:system:lockdown',
  'GUARDED_ACQUIRE',
  'npm run -s edge:profit:00:import:csv',
  'npm run -s executor:run:chain',
  'npm run -s edge:profit:00:doctor',
];

const records = [];
let status = 'PASS';
let reasonCode = 'NONE';
let message = 'Public epoch completed.';
for (const step of steps) {
  const cmd = step === 'GUARDED_ACQUIRE' ? guardedAcquireCommand() : step;
  if (cmd.includes('edge:profit:00:acquire:public:diag') && smokeMode === 'OFFLINE_REPLAY') {
    records.push({ cmd, ec: 0, skipped: 'OFFLINE_REPLAY' });
    continue;
  }
  const rec = run(cmd);
  records.push(rec);

  if (cmd.includes('edge:profit:00:acquire:public:smoke') && rec.ec === 0) {
    smokePassed = true;
    smokeMode = String(readSmokeJson()?.smoke_mode || 'NETWORK');
  }

  if (rec.ec !== 0) {
    if (rec.timed_out) {
      status = 'BLOCKED';
      reasonCode = 'TO01';
      message = `Command timed out: ${cmd}`;
    } else if (cmd.includes('edge:profit:00:acquire:public:smoke')) {
      const smokeReason = readSmokeReason();
      if (smokeReason === 'ACQ02') {
        status = 'NEEDS_DATA';
        reasonCode = 'ACQ02';
        message = 'Public smoke gate reported provider/network unreachability.';
      } else {
        status = 'BLOCKED';
        reasonCode = 'SMK01';
        message = 'Public smoke gate failed preconditions.';
      }
    } else if (!smokePassed && cmd.includes('edge:profit:00:acquire:public')) {
      status = 'FAIL';
      reasonCode = 'SMK_ORDER01';
      message = 'Acquire invoked before smoke PASS.';
    } else if (cmd.includes('edge:profit:00:acquire:public:diag')) {
      status = 'NEEDS_DATA';
      reasonCode = 'ACQ02';
      message = 'Public net diagnostics indicates provider unreachability.';
    } else if (cmd.includes('edge:profit:00:acquire:public')) {
      status = 'NEEDS_DATA';
      reasonCode = 'ACQ02';
      message = 'Public acquire failed to reach providers.';
    } else {
      status = 'BLOCKED';
      reasonCode = 'EC01';
      message = `Command failed: ${cmd}`;
    }
    break;
  }
}

writeMd(OUT_MD, `# EPOCH_EDGE_PROFIT_PUBLIC_00.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- ACQUIRE_MODE: ${acquireMode}\n- smoke_passed: ${smokePassed}
- smoke_mode: ${smokeMode}\n\n## COMMANDS\n\n${records.map((r) => `- ${r.cmd} | ec=${r.ec}`).join('\n') || '- NONE'}\n`);

writeJsonDeterministic(OUT_JSON, {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message,
  next_action: NEXT_ACTION,
  acquire_mode: acquireMode,
  smoke_passed: smokePassed,
  smoke_mode: smokeMode,
  commands: records,
});

console.log(`[${status}] executor_epoch_edge_profit_public_00 — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
