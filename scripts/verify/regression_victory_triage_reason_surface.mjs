import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const src = fs.readFileSync(path.join(ROOT, 'scripts/executor/executor_epoch_victory_triage.mjs'), 'utf8');
const checks = {
  has_reason_reader: src.includes('function readReasonFromEvidence()'),
  checks_victory_precheck_json: src.includes("'victory_precheck.json'"),
  checks_victory_seal_json: src.includes("'victory_seal.json'"),
  non_timeout_uses_surfaced_reason: src.includes("reason_code = r.timedOut ? 'TO01' : (surfaced || 'EC01');"),
};
const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_TRI01';
writeMd(path.join(EXEC, 'REGRESSION_VICTORY_TRIAGE_REASON_SURFACE.md'), `# REGRESSION_VICTORY_TRIAGE_REASON_SURFACE.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s verify:regression:victory-triage-reason-surface\n\n${Object.entries(checks).map(([k,v])=>`- ${k}: ${v}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_victory_triage_reason_surface.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, checks });
console.log(`[${status}] regression_victory_triage_reason_surface — ${reason_code}`);
process.exit(ok ? 0 : 1);
