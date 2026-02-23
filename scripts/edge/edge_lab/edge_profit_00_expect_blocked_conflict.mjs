import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { RUN_ID, writeMd } from './canon.mjs';
import { writeJsonDeterministic } from '../../lib/write_json_deterministic.mjs';
import { resolveProfit00EpochDir, resolveProfit00ManualDir } from './edge_profit_00_paths.mjs';

const ROOT = path.resolve(process.cwd());
const ENV = { ...process.env, PAPER_SAMPLE_PROFILE: 'conflict', EDGE_PROFIT_PROFILE: 'conflict' };

execSync('node scripts/edge/edge_lab/paper_telemetry_sample_gen.mjs', { cwd: ROOT, stdio: 'inherit', env: ENV });

let closeoutExit = 0;
try {
  execSync('node scripts/edge/edge_lab/edge_profit_00_closeout.mjs', { cwd: ROOT, stdio: 'inherit', env: ENV });
} catch (e) {
  closeoutExit = Number(e.status || 1);
}

const EPOCH_DIR = resolveProfit00EpochDir(ROOT);
const MANUAL_DIR = resolveProfit00ManualDir(ROOT);
fs.mkdirSync(MANUAL_DIR, { recursive: true });

const closeoutPath = path.join(MANUAL_DIR, 'edge_profit_00_closeout.json');
const closeout = fs.existsSync(closeoutPath) ? JSON.parse(fs.readFileSync(closeoutPath, 'utf8')) : null;
const closeoutStatus = String(closeout?.status || 'MISSING');
const closeoutReason = String(closeout?.reason_code || 'ME01');

const ok = closeoutExit !== 0 && closeoutStatus === 'BLOCKED' && closeoutReason === 'DC90';
const status = ok ? 'PASS' : 'BLOCKED';
const reasonCode = ok ? 'NONE' : closeoutExit === 0 ? 'HB01' : closeoutStatus !== 'BLOCKED' ? 'HB02' : 'HB03';
const nextAction = ok ? 'npm run -s edge:profit:00' : 'npm run -s edge:profit:00:sample:conflict && npm run -s edge:profit:00';

writeMd(path.join(EPOCH_DIR, 'EXPECTED_BLOCKED_CONFLICT.md'), `# EXPECTED_BLOCKED_CONFLICT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${nextAction}\n\n## Assertions\n\n- closeout_exit_nonzero: ${closeoutExit !== 0}\n- closeout_status: ${closeoutStatus}\n- closeout_reason_code: ${closeoutReason}\n- expected_reason_code: DC90\n`);

writeJsonDeterministic(path.join(MANUAL_DIR, 'expected_blocked_conflict.json'), {
  schema_version: '1.0.0',
  status,
  reason_code: reasonCode,
  run_id: RUN_ID,
  message: ok
    ? 'Conflict scenario blocked as expected with root-cause DC90.'
    : 'Conflict expected-blocked harness assertions failed.',
  next_action: nextAction,
  closeout_exit_code: closeoutExit,
  closeout_status: closeoutStatus,
  closeout_reason_code: closeoutReason,
  expected_closeout_status: 'BLOCKED',
  expected_closeout_reason_code: 'DC90',
});

console.log(`[${status}] edge_profit_00_expect_blocked_conflict — ${reasonCode}`);
process.exit(ok ? 0 : 1);
