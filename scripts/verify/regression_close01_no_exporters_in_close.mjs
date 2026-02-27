import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { getVictoryStepPlan } from '../executor/victory_steps.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:close';

process.env.VICTORY_PROFILE = 'CLOSE';
const steps = getVictoryStepPlan(false).map((x) => x.cmd);
const forbidden = [
  'export:evidence-bundle',
  'verify:regression:evidence-bundle',
  'verify:regression:portable-manifest',
];
const offenders = steps.filter((cmd) => forbidden.some((f) => cmd.includes(f))).sort((a, b) => a.localeCompare(b));
const status = offenders.length === 0 ? 'PASS' : 'FAIL';
const reason_code = offenders.length === 0 ? 'NONE' : 'RG_CLOSE01_NO_EXPORTERS_IN_CLOSE';

writeMd(path.join(EXEC, 'REGRESSION_CLOSE01_NO_EXPORTERS_IN_CLOSE.md'), `# REGRESSION_CLOSE01_NO_EXPORTERS_IN_CLOSE.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${offenders.map((o) => `- offender: ${o}`).join('\n') || '- offenders: []'}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_close01_no_exporters_in_close.json'), { schema_version:'1.0.0', status, reason_code, run_id:RUN_ID, next_action:NEXT_ACTION, steps, offenders, forbidden });
console.log(`[${status}] regression_close01_no_exporters_in_close — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
