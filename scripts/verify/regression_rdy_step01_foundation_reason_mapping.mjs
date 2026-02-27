import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const src = fs.readFileSync(path.join(ROOT, 'scripts/executor/executor_epoch_foundation_seal.mjs'), 'utf8');
const offenders = [];
if (src.includes("reason_code = r.timedOut ? 'TO01' : 'EC01'")) offenders.push('generic_ec01_mapping_present');
if (!src.includes('readSubstepReason()')) offenders.push('substep_reason_reader_missing');
if (!src.includes('FOUNDATION_STEP_EC_')) offenders.push('concrete_step_ec_fallback_missing');

const ok = offenders.length === 0;
const status = ok ? 'PASS' : 'BLOCKED';
const reason = ok ? 'NONE' : 'RG_RDY_STEP01';
writeMd(path.join(EXEC, 'REGRESSION_RDY_STEP01_FOUNDATION_REASON_MAPPING.md'), `# REGRESSION_RDY_STEP01_FOUNDATION_REASON_MAPPING.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: npm run -s epoch:victory:seal\n\n${offenders.length ? offenders.map((o)=>`- offender: ${o}`).join('\n') : '- offenders: []'}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_rdy_step01_foundation_reason_mapping.json'), { schema_version:'1.0.0', status, reason_code: reason, run_id: RUN_ID, offenders });
console.log(`[${status}] regression_rdy_step01_foundation_reason_mapping — ${reason}`);
process.exit(ok ? 0 : 2);
