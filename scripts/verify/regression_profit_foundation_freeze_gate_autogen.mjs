import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';

const src = fs.readFileSync(path.join(ROOT, 'scripts/verify/profit_foundation_freeze_gate.mjs'), 'utf8');
const checks = {
  has_public_diag_autogen_cmd: src.includes("verify:regression:public-diag-bounded"),
  has_export_x2_autogen_cmd: src.includes("verify:regression:export-final-validated-x2"),
  runs_missing_artifacts: src.includes('runIfMissing(item.cmd)'),
  records_cmd_attempt_in_receipt: src.includes('cmd_attempted') && src.includes('cmd_ec'),
};
const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_PFG01';

writeMd(path.join(EXEC_DIR, 'REGRESSION_PROFIT_FOUNDATION_FREEZE_GATE_AUTOGEN.md'), `# REGRESSION_PROFIT_FOUNDATION_FREEZE_GATE_AUTOGEN.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k,v]) => `- ${k}: ${v}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_profit_foundation_freeze_gate_autogen.json'), {
  schema_version: '1.0.0', status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION, checks,
});
console.log(`[${status}] regression_profit_foundation_freeze_gate_autogen — ${reason_code}`);
process.exit(ok ? 0 : 1);
