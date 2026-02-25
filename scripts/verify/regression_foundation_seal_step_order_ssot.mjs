import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:foundation:seal';
const src = fs.readFileSync(path.join(ROOT, 'scripts/executor/executor_epoch_foundation_seal.mjs'), 'utf8');
const first = src.indexOf("'npm run -s epoch:mega:proof:x2'");
const second = src.indexOf("'npm run -s verify:profit:foundation'");
const ok = first >= 0 && second >= 0 && first < second;
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_FS02';
writeMd(path.join(EXEC_DIR, 'REGRESSION_FOUNDATION_SEAL_STEP_ORDER_SSOT.md'), `# REGRESSION_FOUNDATION_SEAL_STEP_ORDER_SSOT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- has_epoch_mega_before_verify_profit_foundation: ${ok}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_foundation_seal_step_order_ssot.json'), { schema_version: '1.0.0', status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION, has_epoch_mega_before_verify_profit_foundation: ok });
console.log(`[${status}] regression_foundation_seal_step_order_ssot — ${reason_code}`);
process.exit(ok ? 0 : 1);
