/**
 * regression_canary01_policy_contract.mjs -- RG_CANARY01_POLICY_CONTRACT
 *
 * Gate: Verify canary_policy exports evaluateCanary; limits schema valid.
 * Sprint 8 FAST gate.
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_CANARY01_POLICY_CONTRACT';
const NEXT_ACTION = 'npm run -s verify:fast';

const checks = [];

// CHECK 1: canary_policy.mjs exists and exports evaluateCanary
try {
  const mod = await import(path.join(ROOT, 'core/promotion/canary_policy.mjs'));
  checks.push({
    check: 'canary_policy_exports',
    pass: typeof mod.evaluateCanary === 'function',
    detail: typeof mod.evaluateCanary === 'function' ? 'evaluateCanary exported' : 'MISSING'
  });

  // CHECK 2: evaluateCanary returns all required fields
  if (typeof mod.evaluateCanary === 'function') {
    const result = mod.evaluateCanary({
      metrics: { exposure_usd: 50, orders_per_min: 2, daily_loss_usd: 5 },
      stage: 'micro_live'
    });

    const required = mod.CANARY_RESULT_REQUIRED_FIELDS || ['action', 'violations', 'reason_code', 'new_state'];
    const missing = required.filter(f => result[f] === undefined);
    checks.push({
      check: 'canary_result_fields',
      pass: missing.length === 0,
      detail: missing.length === 0 ? `All ${required.length} fields present` : `MISSING: ${missing.join(', ')}`
    });

    // CHECK 3: action is valid
    const validActions = mod.VALID_ACTIONS || ['CONTINUE', 'REDUCE', 'PAUSE', 'FLATTEN'];
    checks.push({
      check: 'action_valid',
      pass: validActions.includes(result.action),
      detail: `action=${result.action}`
    });

    // CHECK 4: Safe metrics -> CONTINUE
    checks.push({
      check: 'safe_metrics_continue',
      pass: result.action === 'CONTINUE',
      detail: `Safe metrics -> action=${result.action}`
    });

    // CHECK 5: new_state has required fields
    checks.push({
      check: 'new_state_schema',
      pass: result.new_state && typeof result.new_state.ordersPaused === 'boolean',
      detail: `ordersPaused=${result.new_state?.ordersPaused}`
    });
  }

  // CHECK 6: DEFAULT_LIMITS exported
  checks.push({
    check: 'default_limits_exported',
    pass: mod.CANARY_DEFAULT_LIMITS && typeof mod.CANARY_DEFAULT_LIMITS.micro_live === 'object',
    detail: mod.CANARY_DEFAULT_LIMITS ? 'DEFAULT_LIMITS present' : 'MISSING'
  });
} catch (e) {
  checks.push({ check: 'canary_policy_import', pass: false, detail: `Import error: ${e.message}` });
}

// CHECK 7: Contract JSON exists
try {
  const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'artifacts/contracts/CANARY_POLICY_CONTRACT_v1.json'), 'utf8'));
  checks.push({
    check: 'canary_contract_json',
    pass: contract.version === '1.0.0' && contract.fail_closed_on_missing === true,
    detail: `version=${contract.version}, fail_closed=${contract.fail_closed_on_missing}`
  });
} catch (e) {
  checks.push({ check: 'canary_contract_json', pass: false, detail: `Error: ${e.message}` });
}

// Summary
const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'CANARY01_CONTRACT_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_CANARY01_POLICY_CONTRACT.md'), [
  '# REGRESSION_CANARY01_POLICY_CONTRACT.md', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`, `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_canary01_policy_contract.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code,
  run_id: RUN_ID, next_action: NEXT_ACTION, checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_canary01_policy_contract — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
