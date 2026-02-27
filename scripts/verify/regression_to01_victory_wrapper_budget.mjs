import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { getVictoryStepPlan, getVictoryWrapperBudget } from '../executor/victory_steps.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';

const victoryTestMode = process.env.VICTORY_TEST_MODE === '1';
const stepPlan = getVictoryStepPlan(victoryTestMode);
const budget = getVictoryWrapperBudget(victoryTestMode);

const checks = {
  step_plan_non_empty: stepPlan.length > 0,
  all_step_timeouts_numeric: stepPlan.every((s) => Number.isFinite(Number(s.timeout_ms)) && Number(s.timeout_ms) > 0),
  wrapper_timeout_numeric: Number.isFinite(Number(budget.wrapper_timeout_ms)) && Number(budget.wrapper_timeout_ms) > 0,
  wrapper_budget_meets_minimum: Number(budget.wrapper_timeout_ms) >= Number(budget.required_min_wrapper_timeout_ms),
};

const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_TO01_01';

writeMd(path.join(EXEC, 'REGRESSION_TO01_VICTORY_WRAPPER_BUDGET.md'), `# REGRESSION_TO01_VICTORY_WRAPPER_BUDGET.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n- victory_test_mode: ${victoryTestMode}\n- step_count: ${stepPlan.length}\n- step_timeout_sum_ms: ${budget.step_timeout_sum_ms}\n- overhead_margin_ms: ${budget.overhead_margin_ms}\n- required_min_wrapper_timeout_ms: ${budget.required_min_wrapper_timeout_ms}\n- wrapper_timeout_ms: ${budget.wrapper_timeout_ms}\n\n${Object.entries(checks).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n`);

writeJsonDeterministic(path.join(MANUAL, 'regression_to01_victory_wrapper_budget.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  victory_test_mode: victoryTestMode,
  step_count: stepPlan.length,
  step_timeout_sum_ms: budget.step_timeout_sum_ms,
  overhead_margin_ms: budget.overhead_margin_ms,
  required_min_wrapper_timeout_ms: budget.required_min_wrapper_timeout_ms,
  wrapper_timeout_ms: budget.wrapper_timeout_ms,
  checks,
});

console.log(`[${status}] regression_to01_victory_wrapper_budget — ${reason_code}`);
process.exit(ok ? 0 : 1);
