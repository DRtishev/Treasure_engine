import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';

const forced = spawnSync(process.execPath, ['scripts/executor/executor_epoch_victory_seal.mjs'], {
  cwd: ROOT,
  encoding: 'utf8',
  env: {
    ...process.env,
    VICTORY_TEST_MODE: '0',
    VICTORY_STEP_TIMEOUT_DEFAULT_MS: '10',
    VICTORY_STEP_TIMEOUT_FOUNDATION_MS: '10',
    VICTORY_STEP_TIMEOUT_BUNDLE_X2_MS: '10',
  },
});

const epochDir = path.join(ROOT, 'reports/evidence', `EPOCH-VICTORY-${RUN_ID}`);
const sealPath = path.join(epochDir, 'gates/manual/victory_seal.json');
const triagePath = path.join(epochDir, 'gates/manual/victory_timeout_triage.json');

const checks = {
  forced_run_exits_nonzero: (forced.status || 1) !== 0,
  seal_exists: fs.existsSync(sealPath),
  triage_exists: fs.existsSync(triagePath),
};

let seal = null;
let triage = null;
if (checks.seal_exists) seal = JSON.parse(fs.readFileSync(sealPath, 'utf8'));
if (checks.triage_exists) triage = JSON.parse(fs.readFileSync(triagePath, 'utf8'));
if (seal) {
  checks.seal_reason_to01 = String(seal.reason_code || '') === 'TO01';
  checks.seal_timeout_step_index_present = Number.isInteger(seal.timeout_step_index);
  checks.seal_timeout_cmd_present = typeof seal.timeout_cmd === 'string' && seal.timeout_cmd.length > 0;
}
if (triage) {
  checks.triage_reason_to01 = String(triage.reason_code || '') === 'TO01';
  checks.triage_first_failing_step_index_present = Number.isInteger(triage.first_failing_step_index);
  checks.triage_first_failing_cmd_present = typeof triage.first_failing_cmd === 'string' && triage.first_failing_cmd.length > 0;
}
if (seal && triage) {
  checks.step_index_match = triage.first_failing_step_index === seal.timeout_step_index;
  checks.cmd_match = triage.first_failing_cmd === seal.timeout_cmd;
}

const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_TO01_02';

writeMd(path.join(EXEC, 'REGRESSION_TO01_TIMEOUT_TRIAGE_CONTRACT.md'), `# REGRESSION_TO01_TIMEOUT_TRIAGE_CONTRACT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- forced_run_ec: ${forced.status ?? 'NULL'}\n\n${Object.entries(checks).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_to01_timeout_triage_contract.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  forced_run_ec: forced.status ?? null,
  checks,
});

console.log(`[${status}] regression_to01_timeout_triage_contract — ${reason_code}`);
process.exit(ok ? 0 : 1);
