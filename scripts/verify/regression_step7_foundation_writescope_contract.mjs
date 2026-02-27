import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const foundation = fs.readFileSync(path.join(ROOT, 'scripts/executor/executor_epoch_foundation_seal.mjs'), 'utf8');
const netkill = fs.readFileSync(path.join(ROOT, 'scripts/verify/regression_executor_netkill_runtime_ledger.mjs'), 'utf8');

const offenders = [];
if (foundation.includes("reports/evidence/EXECUTOR/FOUNDATION_SEAL.md")) offenders.push('foundation_seal_writes_executor');
if (foundation.includes("reports/evidence/EXECUTOR/FOUNDATION_TIMEOUT_TRIAGE.md")) offenders.push('foundation_triage_writes_executor');
if (!foundation.includes("EPOCH-FOUNDATION-${RUN_ID}")) offenders.push('foundation_epoch_scope_missing');
if (!netkill.includes("EPOCH-VICTORY-${RUN_ID}")) offenders.push('netkill_regression_epoch_scope_missing');

const ok = offenders.length === 0;
const status = ok ? 'PASS' : 'BLOCKED';
const reason = ok ? 'NONE' : 'RG_STEP7_01';
writeMd(path.join(EXEC, 'REGRESSION_STEP7_FOUNDATION_WRITESCOPE_CONTRACT.md'), `# REGRESSION_STEP7_FOUNDATION_WRITESCOPE_CONTRACT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s epoch:victory:seal\n\n${offenders.length ? offenders.map((o) => `- offender: ${o}`).join('\n') : '- offenders: []'}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_step7_foundation_writescope_contract.json'), {
  schema_version: '1.0.0', status, reason_code: reason, run_id: RUN_ID, offenders,
});
console.log(`[${status}] regression_step7_foundation_writescope_contract — ${reason}`);
process.exit(ok ? 0 : 2);
