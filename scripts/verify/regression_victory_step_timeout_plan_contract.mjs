import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = path.resolve(process.cwd());
const EXEC_DIR = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC_DIR, 'gates/manual');
const NEXT_ACTION = 'npm run -s epoch:victory:seal';

const stepsSrc = fs.readFileSync(path.join(ROOT, 'scripts/executor/victory_steps.mjs'), 'utf8');
const sealSrc = fs.readFileSync(path.join(ROOT, 'scripts/executor/executor_epoch_victory_seal.mjs'), 'utf8');
const triageSrc = fs.readFileSync(path.join(ROOT, 'scripts/executor/executor_epoch_victory_triage.mjs'), 'utf8');
const sealReceiptPath = path.join(MANUAL, 'victory_seal.json');
const triageReceiptPath = path.join(MANUAL, 'victory_timeout_triage.json');

const checks = {
  step_plan_has_per_step_timeout_budgets: stepsSrc.includes('VICTORY_STEP_TIMEOUT_MS')
    && stepsSrc.includes('foundation_seal')
    && stepsSrc.includes('evidence_bundle_deterministic_x2')
    && stepsSrc.includes('getVictoryStepTimeoutMs(cmd)'),
  seal_uses_step_plan_timeout: sealSrc.includes('getVictoryStepPlan(victoryTestMode)')
    && sealSrc.includes('timeoutMs: step.timeout_ms'),
  triage_uses_step_plan_timeout: triageSrc.includes('getVictoryStepPlan(victoryTestMode)')
    && triageSrc.includes('timeoutMs: step.timeout_ms'),
  seal_has_no_global_timeout_budget: !sealSrc.includes('const stepTimeoutMs = Number(process.env.VICTORY_STEP_TIMEOUT_MS'),
  triage_has_no_global_timeout_budget: !triageSrc.includes('VICTORY_TRIAGE_STEP_TIMEOUT_MS'),
  seal_receipt_exists: fs.existsSync(sealReceiptPath),
  triage_receipt_exists: fs.existsSync(triageReceiptPath),
};

if (checks.seal_receipt_exists) {
  const seal = JSON.parse(fs.readFileSync(sealReceiptPath, 'utf8'));
  checks.seal_steps_have_timeout_ms = Array.isArray(seal.steps) && (seal.steps.length === 0 || seal.steps.every((step) => Number.isFinite(Number(step.timeout_ms))));
}

if (checks.triage_receipt_exists) {
  const triage = JSON.parse(fs.readFileSync(triageReceiptPath, 'utf8'));
  checks.triage_steps_have_timeout_ms = Array.isArray(triage.steps) && triage.steps.length > 0 && triage.steps.every((step) => Number.isFinite(Number(step.timeout_ms)));
}

const ok = Object.values(checks).every(Boolean);
const status = ok ? 'PASS' : 'FAIL';
const reason_code = ok ? 'NONE' : 'RG_TO03';

writeMd(path.join(EXEC_DIR, 'REGRESSION_VICTORY_STEP_TIMEOUT_PLAN_CONTRACT.md'), `# REGRESSION_VICTORY_STEP_TIMEOUT_PLAN_CONTRACT.md\n\nSTATUS: ${status}\nREASON_CODE: ${reason_code}\nRUN_ID: ${RUN_ID}\nNEXT_ACTION: ${NEXT_ACTION}\n\n${Object.entries(checks).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n`);
writeJsonDeterministic(path.join(MANUAL, 'regression_victory_step_timeout_plan_contract.json'), {
  schema_version: '1.0.0',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
});
console.log(`[${status}] regression_victory_step_timeout_plan_contract — ${reason_code}`);
process.exit(ok ? 0 : 1);
