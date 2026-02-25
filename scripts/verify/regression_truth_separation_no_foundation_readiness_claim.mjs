import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';
const doc = fs.readFileSync(path.join(ROOT, 'EDGE_LAB/TRUTH_SEPARATION.md'), 'utf8');
const op = fs.readFileSync(path.join(ROOT, 'EDGE_LAB/OPERATOR_SINGLE_ACTION.md'), 'utf8');
const checks = {
  truth_doc_exists: doc.includes('FOUNDATION PASS does not imply DATA READY'),
  operator_has_needs_data: op.includes('NEEDS_DATA'),
  operator_has_single_action: op.includes('npm run -s epoch:victory:seal'),
};
const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_TRU01';
writeMd(path.join(EXEC_DIR, 'REGRESSION_TRUTH_SEPARATION_NO_FOUNDATION_READINESS_CLAIM.md'), `# REGRESSION_TRUTH_SEPARATION_NO_FOUNDATION_READINESS_CLAIM.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k,v])=>`- ${k}: ${v}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_truth_separation_no_foundation_readiness_claim.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, checks });
console.log(`[${status}] regression_truth_separation_no_foundation_readiness_claim — ${reason_code}`);
process.exit(ok ? 0 : 1);
