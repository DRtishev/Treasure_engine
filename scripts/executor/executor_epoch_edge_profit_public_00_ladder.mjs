import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { runBounded } from './spawn_bounded.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR');
const MANUAL_DIR = path.join(EXEC_DIR, 'gates', 'manual');
const OUT_MD = path.join(EXEC_DIR, 'EPOCH_EDGE_PROFIT_PUBLIC_00_LADDER.md');
const OUT_JSON = path.join(MANUAL_DIR, 'epoch_edge_profit_public_00_ladder.json');
const NEXT_ACTION = 'npm run -s epoch:edge:profit:public:00:ladder:node22';
const LOCK_JSON = path.join(ROOT, 'artifacts', 'incoming', 'real_public_market.lock.json');

fs.mkdirSync(MANUAL_DIR, { recursive: true });

function lockSha() {
  if (!fs.existsSync(LOCK_JSON)) return 'MISSING';
  return crypto.createHash('sha256').update(fs.readFileSync(LOCK_JSON)).digest('hex');
}

const steps = [2, 7, 30, 180];
const rows = [];
let finalStatus = 'PASS';
let finalReason = 'NONE';
let finalMessage = 'Ladder completed all steps.';

for (const days of steps) {
  const cmd = `REAL_PUBLIC_LOOKBACK_DAYS=${days} npm run -s epoch:edge:profit:public:00:x2:node22`;
  const r = runBounded(cmd, { cwd: ROOT, env: process.env, maxBuffer: 64 * 1024 * 1024 });
  const epochJsonPath = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR', 'gates', 'manual', 'epoch_edge_profit_public_00_x2.json');
  const epochJson = fs.existsSync(epochJsonPath) ? JSON.parse(fs.readFileSync(epochJsonPath, 'utf8')) : {};
  const lockJson = fs.existsSync(LOCK_JSON) ? JSON.parse(fs.readFileSync(LOCK_JSON, 'utf8')) : {};
  const status = String(epochJson.status || (r.ec === 0 ? 'PASS' : 'BLOCKED'));
  const reason = String(epochJson.reason_code || (r.ec === 0 ? 'NONE' : (r.timedOut ? 'TO01' : 'EC01')));
  rows.push({
    step_id: `LOOKBACK_${String(days).padStart(3, '0')}D`,
    lookback_days: days,
    command_ec: r.ec,
    timed_out: r.timedOut,
    status,
    reason_code: reason,
    selected_provider_route: String(lockJson.route || 'UNKNOWN'),
    selected_net_family: Number(lockJson.selected_net_family || lockJson.net_family || 0),
    lock_sha256: lockSha(),
  });
  if (status !== 'PASS') {
    finalStatus = status;
    finalReason = reason;
    finalMessage = `Stopped at lookback=${days} due to ${reason}.`;
    break;
  }
}

writeMd(OUT_MD, `# EPOCH_EDGE_PROFIT_PUBLIC_00_LADDER.md\n\nSTATUS: ${finalStatus}\nREASON_CODE: ${finalReason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${rows.map((r)=>`- ${r.step_id} | lookback_days=${r.lookback_days} | ec=${r.command_ec} | status=${r.status} | reason=${r.reason_code} | route=${r.selected_provider_route} | selected_net_family=${r.selected_net_family} | lock_sha256=${r.lock_sha256}`).join('\n') || '- NONE'}\n`);

writeJsonDeterministic(OUT_JSON, {
  schema_version: '1.0.0', status: finalStatus, reason_code: finalReason, run_id: RUN_ID,
  message: finalMessage, next_action: NEXT_ACTION, steps: rows,
});

console.log(`[${finalStatus}] executor_epoch_edge_profit_public_00_ladder — ${finalReason}`);
process.exit(finalStatus === 'PASS' ? 0 : 1);
