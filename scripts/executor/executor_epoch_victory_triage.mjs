import path from 'node:path';
import { runBounded } from './spawn_bounded.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { getVictorySteps } from './victory_steps.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';
const victoryTestMode = process.env.VICTORY_TEST_MODE === '1';
const timeoutMs = Number(process.env.VICTORY_TRIAGE_STEP_TIMEOUT_MS || 180000);
const steps = getVictorySteps(victoryTestMode);
const recs = [];
let status = 'PASS';
let reason_code = 'NONE';
let timeout_step_index = null;
let timeout_cmd = null;
for (const [i, cmd] of steps.entries()) {
  const r = runBounded(cmd, { cwd: ROOT, env: process.env, timeoutMs, maxBuffer: 64 * 1024 * 1024 });
  recs.push({ step_index: i + 1, cmd, ec: r.ec, timedOut: Boolean(r.timedOut), timeout_ms: r.timeout_ms });
  if (r.ec !== 0) {
    status = 'BLOCKED';
    reason_code = r.timedOut ? 'TO01' : 'EC01';
    if (r.timedOut) { timeout_step_index = i + 1; timeout_cmd = cmd; }
    break;
  }
}
writeMd(path.join(EXEC_DIR, 'VICTORY_TIMEOUT_TRIAGE.md'), `# VICTORY_TIMEOUT_TRIAGE.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- triage_mode: true\n- timeout_step_index: ${timeout_step_index ?? 'NONE'}\n- timeout_cmd: ${timeout_cmd ?? 'NONE'}\n\n## STEPS\n${recs.map((r)=>`- step_${r.step_index}: ${r.cmd} | ec=${r.ec} | timedOut=${r.timedOut} | timeout_ms=${r.timeout_ms}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'victory_timeout_triage.json'), { schema_version: '1.0.0', status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION, triage_mode: true, timeout_step_index, timeout_cmd, steps: recs });
console.log(`[${status}] executor_epoch_victory_triage — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
