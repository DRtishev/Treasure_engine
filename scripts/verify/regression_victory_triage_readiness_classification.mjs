import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';

const triageSrc = fs.readFileSync(path.join(ROOT, 'scripts/executor/executor_epoch_victory_triage.mjs'), 'utf8');
const checks = {
  triage_handles_readiness_needs_data: triageSrc.includes("step.cmd.includes('verify:public:data:readiness') && r.ec === 2") && triageSrc.includes("status = 'NEEDS_DATA';") && triageSrc.includes("reason_code = 'RDY01';"),
  triage_exit_code_contract_for_needs_data: triageSrc.includes("process.exit(status === 'PASS' ? 0 : (status === 'NEEDS_DATA' ? 2 : 1));"),
};

const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_TRI02';

writeMd(path.join(EXEC_DIR, 'REGRESSION_VICTORY_TRIAGE_READINESS_CLASSIFICATION.md'), `# REGRESSION_VICTORY_TRIAGE_READINESS_CLASSIFICATION.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_victory_triage_readiness_classification.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
});

console.log(`[${status}] regression_victory_triage_readiness_classification — ${reason_code}`);
process.exit(ok ? 0 : 1);
