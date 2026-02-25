import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s verify:regression:node-options-preload-eviction';
const src = fs.readFileSync(path.join(ROOT, 'scripts/executor/executor_run_chain.mjs'), 'utf8');
const directOverwrite = /NODE_OPTIONS\s*=\s*['"`]/.test(src) || /process\.env\.NODE_OPTIONS\s*=/.test(src);
const ledgerPath = path.join(EXEC_DIR, 'NETKILL_LEDGER.json');
let ledgerOk = false;
let verifyRecords = 0;
if (fs.existsSync(ledgerPath)) {
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const recs = Array.isArray(ledger.records) ? ledger.records : [];
  const classifyVerify = (cmd) => /(npm run -s (verify:|gov:|p0:all|edge:profit:0[12]:|export:final-validated))/i.test(String(cmd || ''));
  const verify = recs.filter((r) => classifyVerify(r.cmd));
  verifyRecords = verify.length;
  ledgerOk = verify.length > 0 && verify.every((r) => r.node_options_has_preload === true);
}
const ok = !directOverwrite && ledgerOk;
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_NOD03';
writeMd(path.join(EXEC_DIR, 'REGRESSION_NODE_OPTIONS_PRELOAD_EVICTION.md'), `# REGRESSION_NODE_OPTIONS_PRELOAD_EVICTION.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- direct_overwrite: ${directOverwrite}\n- verify_records: ${verifyRecords}\n- ledger_verify_preload_ok: ${ledgerOk}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_node_options_preload_eviction.json'), { schema_version: '1.0.0', status, reason_code, run_id: RUN_ID, next_action: NEXT_ACTION, direct_overwrite: directOverwrite, verify_records: verifyRecords, ledger_verify_preload_ok: ledgerOk });
console.log(`[${status}] regression_node_options_preload_eviction — ${reason_code}`);
process.exit(ok ? 0 : 1);
