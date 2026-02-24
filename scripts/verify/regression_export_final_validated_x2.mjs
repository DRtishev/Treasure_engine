import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const GOV_DIR = path.join(ROOT, 'reports/evidence/GOV');
const MANUAL = path.join(GOV_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:mega:proof:x2';
fs.mkdirSync(MANUAL, { recursive: true });

function runExport(){ return spawnSync('bash',['-lc','npm run -s export:final-validated'],{cwd:ROOT,encoding:'utf8',timeout:300000,killSignal:'SIGKILL'}); }
function sha(p){ return fs.existsSync(p) ? crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') : 'MISSING'; }
const r1=runExport();
const pathTar=path.join(ROOT,'reports/evidence/EPOCH-EDGE-RC-STRICT-01/artifacts/FINAL_VALIDATED.tar.gz');
const h1=sha(pathTar);
const r2=runExport();
const h2=sha(pathTar);
const status = r1.status===0 && r2.status===0 && h1===h2 ? 'PASS' : 'FAIL';
const reason_code = status==='PASS' ? 'NONE' : 'ND01';
writeMd(path.join(GOV_DIR,'REGRESSION_EXPORT_FINAL_VALIDATED_X2.md'), `# REGRESSION_EXPORT_FINAL_VALIDATED_X2.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- run1_ec: ${r1.status ?? 1}\n- run2_ec: ${r2.status ?? 1}\n- hash_run1: ${h1}\n- hash_run2: ${h2}\n`);
writeJsonDeterministic(path.join(MANUAL,'regression_export_final_validated_x2.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, run1_ec:r1.status??1, run2_ec:r2.status??1, hash_run1:h1, hash_run2:h2, nd01_diff_hint_files: h1===h2?[]:['reports/evidence/EPOCH-EDGE-RC-STRICT-01/artifacts/FINAL_VALIDATED.tar.gz'] });
console.log(`[${status}] regression_export_final_validated_x2 — ${reason_code}`);
process.exit(status==='PASS'?0:1);
