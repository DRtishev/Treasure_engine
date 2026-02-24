import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT=path.resolve(process.cwd());
const EXEC_DIR=path.join(ROOT,'reports/evidence/EXECUTOR');
const MANUAL=path.join(EXEC_DIR,'gates/manual');
const NEXT_ACTION='npm run -s epoch:mega:proof:x2';
fs.mkdirSync(MANUAL,{recursive:true});
const required=[
  'reports/evidence/EXECUTOR/gates/manual/mega_proof_x2.json',
  'reports/evidence/EXECUTOR/gates/manual/regression_no_unbounded_spawnsync.json',
  'reports/evidence/EXECUTOR/gates/manual/regression_node22_wrapper_timeout.json',
  'reports/evidence/EDGE_PROFIT_00/registry/gates/manual/regression_public_diag_bounded.json',
  'reports/evidence/GOV/gates/manual/regression_export_final_validated_x2.json',
];
const rows=required.map((r)=>{const abs=path.join(ROOT,r);if(!fs.existsSync(abs))return {path:r,ok:false,status:'MISSING'};try{const j=JSON.parse(fs.readFileSync(abs,'utf8'));return {path:r,ok:j.status==='PASS',status:j.status||'UNKNOWN'};}catch{return {path:r,ok:false,status:'INVALID'};}});
const frozen=rows.every((x)=>x.ok);
const status=frozen?'PASS':'BLOCKED';
const reason_code=frozen?'NONE':'EC01';
writeMd(path.join(EXEC_DIR,'PROFIT_FOUNDATION_FREEZE_GATE.md'), `# PROFIT_FOUNDATION_FREEZE_GATE.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${rows.map((x)=>`- ${x.path}: ${x.status}`).join('\n')}\n- foundation_frozen: ${frozen}\n`);
writeJsonDeterministic(path.join(MANUAL,'profit_foundation_freeze_gate.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, foundation_frozen:frozen, checks:rows });
console.log(`[${status}] profit_foundation_freeze_gate — ${reason_code}`);
process.exit(frozen?0:1);
