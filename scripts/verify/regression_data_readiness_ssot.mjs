import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s verify:public:data:readiness';
const model = fs.readFileSync(path.join(ROOT, 'EDGE_LAB/DATA_AUTHORITY_MODEL.md'), 'utf8');
const src = fs.readFileSync(path.join(ROOT, 'scripts/verify/data_readiness_seal.mjs'), 'utf8');
const checks = {
  model_next_action: model.includes('NEXT_ACTION: npm run -s verify:public:data:readiness'),
  model_rdy01: model.includes('RDY01'),
  model_rdy02: model.includes('RDY02'),
  model_rdy_net01: model.includes('RDY_NET01'),
  model_rdy_sch01: model.includes('RDY_SCH01'),
  src_registry: src.includes('const registry ='),
  src_provider: src.includes('BYBIT_LIQ'),
  src_reasons: src.includes('RDY01') && src.includes('RDY02') && src.includes('RDY_NET01') && src.includes('RDY_SCH01'),
};
const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RDY_SCH01';
writeMd(path.join(EXEC_DIR, 'REGRESSION_DATA_READINESS_SSOT.md'), `# REGRESSION_DATA_READINESS_SSOT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k,v])=>`- ${k}: ${v}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_data_readiness_ssot.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, checks });
console.log(`[${status}] regression_data_readiness_ssot — ${reason_code}`);
process.exit(ok ? 0 : 1);
