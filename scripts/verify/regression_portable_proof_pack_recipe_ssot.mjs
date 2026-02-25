import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s verify:regression:portable-proof-pack-recipe-ssot';
const doc = fs.readFileSync(path.join(ROOT, 'EDGE_LAB/PORTABLE_PROOF_PACK.md'), 'utf8');
const checks = {
  has_export_cmd: doc.includes('EVIDENCE_BUNDLE_PORTABLE=1 npm run -s export:evidence-bundle'),
  has_verify_cmd: doc.includes('EVIDENCE_BUNDLE_PORTABLE=1 npm run -s verify:regression:evidence-bundle-portable-mode'),
  has_env_byte_free: doc.toLowerCase().includes('env-byte-free'),
};
const status = Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL';
const reason_code = status === 'PASS' ? 'NONE' : 'EC01';
writeMd(path.join(EXEC_DIR, 'REGRESSION_PORTABLE_PROOF_PACK_RECIPE_SSOT.md'), `# REGRESSION_PORTABLE_PROOF_PACK_RECIPE_SSOT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k,v])=>`- ${k}: ${v}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_portable_proof_pack_recipe_ssot.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, checks });
console.log(`[${status}] regression_portable_proof_pack_recipe_ssot — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
