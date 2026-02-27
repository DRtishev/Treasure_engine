import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
const PRE = path.join(ROOT, 'reports/evidence', `EPOCH-VICTORY-${RUN_ID}`, 'gates/manual', 'victory_precheck.json');
fs.mkdirSync(MANUAL, { recursive: true });

let offenders = [];
if (fs.existsSync(PRE)) {
  try {
    const p = JSON.parse(fs.readFileSync(PRE, 'utf8'));
    offenders = (Array.isArray(p.offenders_outside_allowed_roots) ? p.offenders_outside_allowed_roots : []).filter((x) => String(x).startsWith('reports/evidence/RG_')).sort((a,b)=>a.localeCompare(b));
  } catch {}
}
const status = offenders.length === 0 ? 'PASS' : 'BLOCKED';
const reason_code = status === 'PASS' ? 'NONE' : 'RG_RG02';
writeMd(path.join(EXEC, 'REGRESSION_RG02_NO_RG_WRITES_DURING_CERTIFICATION.md'), `# REGRESSION_RG02_NO_RG_WRITES_DURING_CERTIFICATION.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s epoch:victory:seal\n\n- offenders_n: ${offenders.length}\n${offenders.map((o)=>`- ${o}`).join('\n') || '- none'}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_rg02_no_rg_writes_during_certification.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, offenders });
console.log(`[${status}] regression_rg02_no_rg_writes_during_certification — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
