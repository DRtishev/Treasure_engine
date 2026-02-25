import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';
const sealSrc = fs.readFileSync(path.join(ROOT, 'scripts/executor/executor_epoch_victory_seal.mjs'), 'utf8');
const triageSrc = fs.readFileSync(path.join(ROOT, 'scripts/executor/executor_epoch_victory_triage.mjs'), 'utf8');
const checks = {
  seal_uses_shared_steps: sealSrc.includes("getVictorySteps(victoryTestMode)"),
  triage_uses_shared_steps: triageSrc.includes("getVictorySteps(victoryTestMode)"),
  triage_next_action_is_seal: triageSrc.includes("const NEXT_ACTION = 'npm run -s epoch:victory:seal'"),
};
const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_TRI01';
writeMd(path.join(EXEC_DIR, 'REGRESSION_VICTORY_TRIAGE_SSOT.md'), `# REGRESSION_VICTORY_TRIAGE_SSOT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k,v])=>`- ${k}: ${v}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_victory_triage_ssot.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, checks });
console.log(`[${status}] regression_victory_triage_ssot — ${reason_code}`);
process.exit(ok ? 0 : 1);
