import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';
const sealPath = path.join(MANUAL, 'victory_seal.json');
let checks = { victory_seal_exists: fs.existsSync(sealPath), to01_contract_ok: true };
if (checks.victory_seal_exists) {
  const seal = JSON.parse(fs.readFileSync(sealPath, 'utf8'));
  if (String(seal.reason_code) === 'TO01') {
    const triagePath = path.join(MANUAL, 'victory_timeout_triage.json');
    const triageExists = fs.existsSync(triagePath);
    checks = {
      ...checks,
      timeout_step_index_present: Number.isInteger(seal.timeout_step_index),
      timeout_cmd_present: typeof seal.timeout_cmd === 'string' && seal.timeout_cmd.length > 0,
      triage_receipt_exists: triageExists,
    };
    checks.to01_contract_ok = checks.timeout_step_index_present && checks.timeout_cmd_present && checks.triage_receipt_exists;
  }
}
const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_TO02';
writeMd(path.join(EXEC_DIR, 'REGRESSION_VICTORY_TIMEOUT_TRIAGE_CONTRACT.md'), `# REGRESSION_VICTORY_TIMEOUT_TRIAGE_CONTRACT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k,v])=>`- ${k}: ${v}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_victory_timeout_triage_contract.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, checks });
console.log(`[${status}] regression_victory_timeout_triage_contract — ${reason_code}`);
process.exit(ok ? 0 : 1);
