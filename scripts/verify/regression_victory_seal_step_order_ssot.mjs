import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';

const src = fs.readFileSync(path.join(ROOT,'scripts/executor/victory_steps.mjs'),'utf8');
const doc = fs.readFileSync(path.join(ROOT,'EDGE_LAB/VICTORY_SEAL.md'),'utf8');
const required = [
  'verify:regression:determinism-audit',
  'verify:regression:net-kill-preload-hard',
  'verify:regression:net-kill-preload-path-safe',
  'verify:regression:executor-netkill-runtime-ledger',
  'epoch:foundation:seal',
  'verify:public:data:readiness',
  'export:evidence-bundle',
  'export:evidence-bundle:portable',
  'verify:regression:evidence-bundle-deterministic-x2',
  'verify:regression:evidence-bundle-portable-mode',
];
const fullBlockStart = src.indexOf('const VICTORY_FULL_MODE_STEPS');
const fullBlockEnd = src.indexOf(']);', fullBlockStart);
const fullBlock = fullBlockStart >= 0 && fullBlockEnd > fullBlockStart ? src.slice(fullBlockStart, fullBlockEnd) : '';
let ok=true; let last=-1;
for(const s of required){ const i=fullBlock.indexOf(s); if(i<0||i<last) ok=false; last=i; if(!doc.includes(s)) ok=false; }
const status=ok?'PASS':'FAIL';
const reason_code=status==='PASS'?'NONE':'RG_VIC01';
writeMd(path.join(EXEC_DIR,'REGRESSION_VICTORY_SEAL_STEP_ORDER_SSOT.md'), `# REGRESSION_VICTORY_SEAL_STEP_ORDER_SSOT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n`);
writeJsonDeterministic(path.join(MANUAL,'regression_victory_seal_step_order_ssot.json'),{schema_version:'1.0.0',status,reason_code,run_id:RUN_ID,next_action:NEXT_ACTION,required});
console.log(`[${status}] regression_victory_seal_step_order_ssot — ${reason_code}`);
process.exit(status==='PASS'?0:1);
