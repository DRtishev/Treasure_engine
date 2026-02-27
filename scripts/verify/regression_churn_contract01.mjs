import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const prePath = path.join(ROOT, 'reports/evidence', `EPOCH-VICTORY-${RUN_ID}`, 'gates/manual', 'victory_precheck.json');
let reason = 'MISSING';
let offenders = [];
if (fs.existsSync(prePath)) {
  try {
    const pre = JSON.parse(fs.readFileSync(prePath, 'utf8'));
    reason = String(pre.reason_code || 'MISSING');
    offenders = Array.isArray(pre.offenders_outside_allowed_roots) ? pre.offenders_outside_allowed_roots : [];
  } catch {
    reason = 'INVALID';
  }
}

const impliesOffenders = reason !== 'CHURN01' || offenders.length > 0;
const status = impliesOffenders ? 'PASS' : 'BLOCKED';
const reason_code = impliesOffenders ? 'NONE' : 'RG_CHURN_CONTRACT01';

writeMd(path.join(EXEC, 'REGRESSION_CHURN_CONTRACT01.md'), `# REGRESSION_CHURN_CONTRACT01.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s epoch:victory:seal\n\n- precheck_path: ${path.relative(ROOT, prePath)}\n- precheck_reason_code: ${reason}\n- offenders_outside_allowed_roots_n: ${offenders.length}\n- churn_implies_non_empty_offenders: ${impliesOffenders}\n\n## OFFENDERS_OUTSIDE_ALLOWED_ROOTS\n${offenders.map((o) => `- ${o}`).join('\n') || '- none'}\n`);

writeJsonDeterministic(path.join(MANUAL, 'regression_churn_contract01.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  precheck_path: path.relative(ROOT, prePath),
  precheck_reason_code: reason,
  offenders_outside_allowed_roots_n: offenders.length,
  churn_implies_non_empty_offenders: impliesOffenders,
  offenders_outside_allowed_roots: offenders,
});

console.log(`[${status}] regression_churn_contract01 — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
