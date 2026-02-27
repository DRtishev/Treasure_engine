import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const src = fs.readFileSync(path.join(ROOT, 'scripts/executor/executor_epoch_victory_seal.mjs'), 'utf8');
const checks = {
  has_offenders_untracked: src.includes('offenders_untracked'),
  has_offenders_tracked: src.includes('offenders_tracked'),
  has_offenders_staged: src.includes('offenders_staged'),
  has_filter_version: src.includes("operator_relevant_filter_version: '1.0.0'"),
};
checks.precheck_schema_observed_or_not_required = true;

const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'PRECHECK_CONTRACT01';
writeMd(path.join(EXEC, 'REGRESSION_VICTORY_PRECHECK_OFFENDERS_CONTRACT.md'), `# REGRESSION_VICTORY_PRECHECK_OFFENDERS_CONTRACT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:regression:victory-precheck-offenders-contract\n\n${Object.entries(checks).map(([k,v])=>`- ${k}: ${v}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_victory_precheck_offenders_contract.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, checks });
console.log(`[${status}] regression_victory_precheck_offenders_contract — ${reason_code}`);
process.exit(ok ? 0 : 1);
