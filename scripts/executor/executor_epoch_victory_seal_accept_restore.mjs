import fs from 'node:fs';
import path from 'node:path';
import { runBounded } from './spawn_bounded.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';

fs.mkdirSync(MANUAL, { recursive: true });

if (String(process.env.CI || '').toLowerCase() === 'true') {
  writeMd(path.join(EXEC_DIR, 'ACCEPT_RESTORE_USED.md'), `# ACCEPT_RESTORE_USED.md\n\nSTATUS: BLOCKED\nREASON_CODE: RG_OPA_CI\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- command: npm run -s epoch:victory:seal\n- override_env_set_by_wrapper: false\n- ci_blocked: true\n`);
  writeJsonDeterministic(path.join(MANUAL, 'accept_restore_used.json'), {
    schema_version: '1.0.0',
    status: 'BLOCKED',
    reason_code: 'RG_OPA_CI',
    run_id: RUN_ID,
    next_action: NEXT_ACTION,
    command: 'npm run -s epoch:victory:seal',
    override_env_set_by_wrapper: false,
    ci_blocked: true,
    inner_ec: 1,
  });
  console.log('[BLOCKED] executor_epoch_victory_seal_accept_restore — RG_OPA_CI');
  process.exit(1);
}

const env = { ...process.env, TREASURE_I_UNDERSTAND_RESTORE: '1' };
const run = runBounded('npm run -s epoch:victory:seal', {
  cwd: ROOT,
  env,
  timeoutMs: 30 * 60 * 1000,
  maxBuffer: 64 * 1024 * 1024,
});

const propagated_ec = run.ec === 0 ? 0 : (run.ec === 2 ? 2 : 1);
const status = propagated_ec === 0 ? 'PASS' : (propagated_ec === 2 ? 'NEEDS_DATA' : 'BLOCKED');
const reason_code = propagated_ec === 0 ? 'NONE' : (propagated_ec === 2 ? 'RDY01' : (run.timedOut ? 'TO01' : 'EC01'));

writeMd(path.join(EXEC_DIR, 'ACCEPT_RESTORE_USED.md'), `# ACCEPT_RESTORE_USED.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- command: npm run -s epoch:victory:seal\n- override_env_set_by_wrapper: true\n- ci_blocked: false\n- timed_out: ${Boolean(run.timedOut)}\n- inner_ec: ${run.ec}\n- propagated_ec: ${propagated_ec}\n`);
writeJsonDeterministic(path.join(MANUAL, 'accept_restore_used.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  command: 'npm run -s epoch:victory:seal',
  override_env_set_by_wrapper: true,
  ci_blocked: false,
  timed_out: Boolean(run.timedOut),
  inner_ec: run.ec,
  propagated_ec,
});

console.log(`[${status}] executor_epoch_victory_seal_accept_restore — ${reason_code}`);
process.exit(propagated_ec);
