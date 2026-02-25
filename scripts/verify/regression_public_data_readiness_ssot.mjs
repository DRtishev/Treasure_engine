import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s verify:public:data:readiness';
const doc = fs.readFileSync(path.join(ROOT, 'EDGE_LAB/PUBLIC_DATA_READINESS.md'), 'utf8');
const src = fs.readFileSync(path.join(ROOT, 'scripts/verify/data_readiness_seal.mjs'), 'utf8');
const checks = {
  doc_next_action: doc.includes('NEXT_ACTION: npm run -s verify:public:data:readiness'),
  src_next_action: src.includes("const NEXT_ACTION = 'npm run -s verify:public:data:readiness'"),
  doc_lock: doc.includes('artifacts/incoming/bybit_liq.lock.json'),
  src_lock: src.includes('bybit_liq.lock.json'),
  doc_raw: doc.includes('artifacts/incoming/bybit_liq.raw.json'),
  src_raw: src.includes('bybit_liq.raw.json'),
};
const status = Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL';
const reason_code = status === 'PASS' ? 'NONE' : 'EC01';
writeMd(path.join(EXEC_DIR, 'REGRESSION_PUBLIC_DATA_READINESS_SSOT.md'), `# REGRESSION_PUBLIC_DATA_READINESS_SSOT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k,v])=>`- ${k}: ${v}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_public_data_readiness_ssot.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, checks });
console.log(`[${status}] regression_public_data_readiness_ssot — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
