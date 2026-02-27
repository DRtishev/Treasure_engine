import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { getVictoryStepPlan } from '../executor/victory_steps.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
const NEXT_ACTION = 'npm run -s verify:fast';

process.env.VICTORY_PROFILE = 'FAST';
const steps = getVictoryStepPlan(false).map((s) => s.cmd);
const forbiddenMatchers = [
  'epoch:foundation:seal',
  'epoch:mega:proof:x2',
  'export:evidence-bundle',
  'verify:public:data:readiness',
];

const offenders = steps.filter((cmd) => forbiddenMatchers.some((m) => cmd.includes(m))).sort((a, b) => a.localeCompare(b));
const status = offenders.length === 0 ? 'PASS' : 'FAIL';
const reason_code = offenders.length === 0 ? 'NONE' : 'RG_FAST01';

writeMd(path.join(EXEC, 'REGRESSION_VICTORY_FAST_NO_HEAVY.md'), `# REGRESSION_VICTORY_FAST_NO_HEAVY.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- fast_steps_n: ${steps.length}\n\n## OFFENDERS\n${offenders.map((o) => `- ${o}`).join('\n') || '- NONE'}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_victory_fast_no_heavy.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  fast_steps: steps,
  offenders,
  forbidden_matchers: forbiddenMatchers,
});

console.log(`[${status}] regression_victory_fast_no_heavy — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
