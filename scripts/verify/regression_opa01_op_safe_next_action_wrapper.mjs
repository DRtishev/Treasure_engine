import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';
const WRAPPER = 'npm run -s epoch:victory:seal:accept-restore';

const sealSrc = fs.readFileSync(path.join(ROOT, 'scripts/executor/executor_epoch_victory_seal.mjs'), 'utf8');
const sealReceiptPath = path.join(MANUAL, 'victory_seal.json');

const checks = {
  seal_has_wrapper_constant: sealSrc.includes("const ACCEPT_RESTORE_NEXT_ACTION = 'npm run -s epoch:victory:seal:accept-restore';"),
  seal_op_safe_writes_wrapper_next_action: sealSrc.includes("next_action: ACCEPT_RESTORE_NEXT_ACTION"),
  wrapper_script_registered_in_code: sealSrc.includes('ACCEPT_RESTORE_NEXT_ACTION'),
  op_safe_receipt_next_action_wrapper: true,
};

if (fs.existsSync(sealReceiptPath)) {
  const seal = JSON.parse(fs.readFileSync(sealReceiptPath, 'utf8'));
  const reason = String(seal.reason_code || 'NONE');
  if (reason === 'OP_SAFE01') {
    checks.op_safe_receipt_next_action_wrapper = String(seal.next_action || '') === WRAPPER && !/\s[A-Z_]+=/.test(String(seal.next_action || ''));
  }
}

const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_OPA01';

writeMd(path.join(EXEC_DIR, 'REGRESSION_OPA01_OP_SAFE_NEXT_ACTION_WRAPPER.md'), `# REGRESSION_OPA01_OP_SAFE_NEXT_ACTION_WRAPPER.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_opa01_op_safe_next_action_wrapper.json'), {
  schema_version: '1.0.0', status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION, checks,
});
console.log(`[${status}] regression_opa01_op_safe_next_action_wrapper — ${reason_code}`);
process.exit(ok ? 0 : 1);
