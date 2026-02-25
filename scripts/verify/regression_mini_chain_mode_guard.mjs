import path from 'node:path';
import { runBounded } from '../executor/spawn_bounded.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s verify:regression:mini-chain-mode-guard';

const run = runBounded('EXECUTOR_CHAIN_MINI=1 npm run -s executor:run:chain', {
  cwd: ROOT,
  env: { ...process.env, VICTORY_TEST_MODE: '0' },
  maxBuffer: 64 * 1024 * 1024,
  timeoutMs: 20000,
});

const blocked = run.ec !== 0 && /RG_MINI01/.test(`${run.stdout}\n${run.stderr}`);
const status = blocked ? 'PASS' : 'FAIL';
const reason_code = blocked ? 'NONE' : 'RG_MINI01';

writeMd(path.join(EXEC_DIR, 'REGRESSION_MINI_CHAIN_MODE_GUARD.md'), `# REGRESSION_MINI_CHAIN_MODE_GUARD.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- chain_ec: ${run.ec}\n- rg_mini01_detected: ${blocked}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_mini_chain_mode_guard.json'), {
  schema_version: '1.0.0', status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION,
  chain_ec: run.ec, rg_mini01_detected: blocked,
});
console.log(`[${status}] regression_mini_chain_mode_guard — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
