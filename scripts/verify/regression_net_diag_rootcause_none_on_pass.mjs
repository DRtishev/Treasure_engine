import fs from 'node:fs';
import path from 'node:path';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';

const ROOT = path.resolve(process.cwd());
const REG_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_PROFIT_00', 'registry');
const MANUAL_DIR = path.join(REG_DIR, 'gates', 'manual');
const NEXT_ACTION = 'npm run -s epoch:edge:profit:public:00:x2:node22';
fs.mkdirSync(MANUAL_DIR, { recursive: true });

const src = fs.readFileSync(path.join(ROOT, 'scripts/edge/edge_lab/edge_profit_00_acquire_public_diag.mjs'), 'utf8');
const hasPassNone = src.includes('if (pass) return \'NONE\';');
const hasOrder = src.includes("const severityOrder = ['DNS01','TCP01','TLS01','HTTP01','RL01','PB01'];");
const status = hasPassNone && hasOrder ? 'PASS' : 'FAIL';
const reasonCode = status === 'PASS' ? 'NONE' : 'RG01';

writeMd(path.join(REG_DIR, 'REGRESSION_NET_DIAG_ROOTCAUSE_NONE_ON_PASS.md'), `# REGRESSION_NET_DIAG_ROOTCAUSE_NONE_ON_PASS.md\n\nSTATUS: ${status}\nREASON_CODE: ${reasonCode}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- pass_sets_none_present: ${hasPassNone}\n- severity_order_present: ${hasOrder}\n`);
writeJsonDeterministic(path.join(MANUAL_DIR, 'regression_net_diag_rootcause_none_on_pass.json'), {
  schema_version:'1.0.0', status, reason_code: reasonCode, run_id: RUN_ID,
  message: status === 'PASS' ? 'Net diag root-cause semantics present.' : 'Net diag root-cause semantics missing.', next_action: NEXT_ACTION,
  pass_sets_none_present: hasPassNone,
  severity_order_present: hasOrder,
});
console.log(`[${status}] regression_net_diag_rootcause_none_on_pass — ${reasonCode}`);
process.exit(status === 'PASS' ? 0 : 1);
