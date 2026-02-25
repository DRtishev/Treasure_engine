import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const doc = fs.readFileSync(path.join(ROOT, 'EDGE_LAB/PROFIT_FOUNDATION_FREEZE.md'), 'utf8');
const src = fs.readFileSync(path.join(ROOT, 'scripts/executor/executor_epoch_foundation_seal.mjs'), 'utf8');
const expected = 'npm run -s epoch:foundation:seal';
const ok = doc.includes(`NEXT_ACTION: ${expected}`) && src.includes(`const NEXT_ACTION = '${expected}'`);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_FS01';
writeMd(path.join(EXEC_DIR, 'REGRESSION_FOUNDATION_SEAL_NEXT_ACTION_SSOT.md'), `# REGRESSION_FOUNDATION_SEAL_NEXT_ACTION_SSOT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${expected}\n\n- doc_has_next_action: ${doc.includes(`NEXT_ACTION: ${expected}`)}\n- executor_has_next_action: ${src.includes(`const NEXT_ACTION = '${expected}'`)}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_foundation_seal_next_action_ssot.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action: expected });
console.log(`[${status}] regression_foundation_seal_next_action_ssot — ${reason_code}`);
process.exit(ok ? 0 : 1);
