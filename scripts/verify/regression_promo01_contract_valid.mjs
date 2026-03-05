/**
 * regression_promo01_contract_valid.mjs -- RG_PROMO01_CONTRACT_VALID
 *
 * Gate: Verify promotion_ladder exports evaluatePromotion; criteria schema valid.
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

const GATE_ID = 'RG_PROMO01_CONTRACT_VALID';
const NEXT_ACTION = 'npm run -s verify:fast';

const checks = [];

// CHECK 1: promotion_ladder.mjs exists and exports evaluatePromotion
try {
  const mod = await import(path.join(ROOT, 'core/promotion/promotion_ladder.mjs'));
  checks.push({
    check: 'promotion_ladder_exports',
    pass: typeof mod.evaluatePromotion === 'function',
    detail: typeof mod.evaluatePromotion === 'function' ? 'evaluatePromotion exported' : 'MISSING'
  });

  // CHECK 2: evaluatePromotion returns all required fields
  if (typeof mod.evaluatePromotion === 'function') {
    const result = mod.evaluatePromotion({
      current_stage: 'paper',
      metrics: { min_trades: 150, stability_window_days: 20, max_drawdown: 0.03, sharpe: 0.7, win_rate: 0.55 }
    });

    const required = mod.PROMOTION_RESULT_REQUIRED_FIELDS || [
      'eligible', 'verdict', 'target_stage', 'criteria_results', 'reason_code', 'evidence_summary'
    ];
    const missing = required.filter(f => result[f] === undefined);
    checks.push({
      check: 'promotion_result_fields',
      pass: missing.length === 0,
      detail: missing.length === 0 ? `All ${required.length} fields present` : `MISSING: ${missing.join(', ')}`
    });

    // CHECK 3: verdict is valid
    const validVerdicts = mod.VALID_VERDICTS || ['PROMOTE_ELIGIBLE', 'BLOCKED', 'INSUFFICIENT_DATA'];
    checks.push({
      check: 'verdict_valid',
      pass: validVerdicts.includes(result.verdict),
      detail: `verdict=${result.verdict}`
    });

    // CHECK 4: criteria_results is array
    checks.push({
      check: 'criteria_results_array',
      pass: Array.isArray(result.criteria_results) && result.criteria_results.length > 0,
      detail: `criteria_results length=${result.criteria_results?.length}`
    });

    // CHECK 5: Each criteria_result has required fields
    const crFields = ['criterion', 'required', 'actual', 'pass'];
    const crMissing = result.criteria_results.some(cr =>
      crFields.some(f => cr[f] === undefined && f !== 'actual')
    );
    checks.push({
      check: 'criteria_result_schema',
      pass: !crMissing,
      detail: crMissing ? 'Some criteria results missing fields' : 'All criteria results have required fields'
    });
  }

  // CHECK 6: STAGES exported
  checks.push({
    check: 'stages_exported',
    pass: Array.isArray(mod.STAGES) && mod.STAGES.length >= 4,
    detail: `STAGES=${JSON.stringify(mod.STAGES)}`
  });
} catch (e) {
  checks.push({ check: 'promotion_ladder_import', pass: false, detail: `Import error: ${e.message}` });
}

// CHECK 7: Contract JSON exists
try {
  const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'artifacts/contracts/PROMOTION_CONTRACT_v1.json'), 'utf8'));
  checks.push({
    check: 'promotion_contract_json',
    pass: contract.version === '1.0.0' && Array.isArray(contract.stages),
    detail: `version=${contract.version}, stages=${contract.stages?.length}`
  });
} catch (e) {
  checks.push({ check: 'promotion_contract_json', pass: false, detail: `Error: ${e.message}` });
}

// Summary
const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'PROMO01_CONTRACT_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_PROMO01_CONTRACT_VALID.md'), [
  '# REGRESSION_PROMO01_CONTRACT_VALID.md', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`, `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_promo01_contract_valid.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code,
  run_id: RUN_ID, next_action: NEXT_ACTION, checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_promo01_contract_valid — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
