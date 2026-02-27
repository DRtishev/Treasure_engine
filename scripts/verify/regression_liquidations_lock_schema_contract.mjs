import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s verify:public:data:readiness';
const doc = fs.readFileSync(path.join(ROOT, 'EDGE_LAB/LIQUIDATIONS_INTELLIGENCE_ROUTE.md'), 'utf8');
const checks = {
  has_lock_path: doc.includes('artifacts/incoming/liquidations/bybit_ws_v5/<RUN_ID>/lock.json'),
  has_raw_path: doc.includes('artifacts/incoming/liquidations/bybit_ws_v5/<RUN_ID>/raw.jsonl'),
  has_schema: doc.includes('liquidations.bybit_ws_v5.v1'),
  has_rdy01: doc.includes('RDY01'),
  has_rdy02: doc.includes('RDY02'),
};
const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_LIQ01';
writeMd(path.join(EXEC_DIR, 'REGRESSION_LIQUIDATIONS_LOCK_SCHEMA_CONTRACT.md'), `# REGRESSION_LIQUIDATIONS_LOCK_SCHEMA_CONTRACT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k,v])=>`- ${k}: ${v}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_liquidations_lock_schema_contract.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, checks });
console.log(`[${status}] regression_liquidations_lock_schema_contract — ${reason_code}`);
process.exit(ok ? 0 : 1);
