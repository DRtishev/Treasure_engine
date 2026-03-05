/**
 * regression_realism01_cost_contract.mjs -- RG_REALISM01_COST_CONTRACT
 *
 * Gate: Verify cost_model SSOT exports computeTotalCost with all required fields.
 * Sprint 7 FAST gate.
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_REALISM01_COST_CONTRACT';
const NEXT_ACTION = 'npm run -s verify:fast';

const checks = [];

// CHECK 1: core/cost/cost_model.mjs exists and exports computeTotalCost
try {
  const mod = await import(path.join(ROOT, 'core/cost/cost_model.mjs'));
  checks.push({
    check: 'cost_model_exports_computeTotalCost',
    pass: typeof mod.computeTotalCost === 'function',
    detail: typeof mod.computeTotalCost === 'function'
      ? 'computeTotalCost is exported function'
      : 'computeTotalCost NOT found'
  });

  // CHECK 2: computeTotalCost returns all required fields
  if (typeof mod.computeTotalCost === 'function') {
    const result = mod.computeTotalCost({
      price: 50000, qty: 0.01, side: 'BUY', order_type: 'TAKER', mode: 'backtest'
    });

    const required = mod.COST_RESULT_REQUIRED_FIELDS || [
      'fee_bps', 'fee_usd', 'slippage_bps', 'slippage_usd',
      'funding_bps', 'funding_usd', 'funding_status',
      'fill_ratio', 'filled_qty', 'total_cost_bps', 'total_cost_usd', 'exec_price'
    ];

    const missing = required.filter(f => result[f] === undefined);
    checks.push({
      check: 'cost_result_required_fields',
      pass: missing.length === 0,
      detail: missing.length === 0
        ? `All ${required.length} required fields present`
        : `MISSING: ${missing.join(', ')}`
    });

    // CHECK 3: Types are correct
    const typeChecks = [
      ['fee_bps', 'number'], ['fee_usd', 'number'],
      ['slippage_bps', 'number'], ['slippage_usd', 'number'],
      ['funding_bps', 'number'], ['funding_usd', 'number'],
      ['funding_status', 'string'],
      ['fill_ratio', 'number'], ['filled_qty', 'number'],
      ['total_cost_bps', 'number'], ['total_cost_usd', 'number'],
      ['exec_price', 'number']
    ];
    const typeFails = typeChecks.filter(([k, t]) => typeof result[k] !== t);
    checks.push({
      check: 'cost_result_field_types',
      pass: typeFails.length === 0,
      detail: typeFails.length === 0
        ? 'All fields have correct types'
        : `Type mismatch: ${typeFails.map(([k, t]) => `${k} expected ${t} got ${typeof result[k]}`).join(', ')}`
    });

    // CHECK 4: fill_ratio in [0, 1]
    checks.push({
      check: 'fill_ratio_range',
      pass: result.fill_ratio >= 0 && result.fill_ratio <= 1,
      detail: `fill_ratio=${result.fill_ratio}`
    });

    // CHECK 5: funding_status is valid enum
    const validStatuses = ['KNOWN', 'BOUNDS_ESTIMATE', 'INSUFFICIENT_EVIDENCE'];
    checks.push({
      check: 'funding_status_valid',
      pass: validStatuses.includes(result.funding_status),
      detail: `funding_status=${result.funding_status}`
    });
  }
} catch (e) {
  checks.push({ check: 'cost_model_import', pass: false, detail: `Import error: ${e.message}` });
}

// CHECK 6: fees_model.mjs exists
try {
  const feesMod = await import(path.join(ROOT, 'core/cost/fees_model.mjs'));
  checks.push({
    check: 'fees_model_exists',
    pass: typeof feesMod.computeFee === 'function',
    detail: typeof feesMod.computeFee === 'function' ? 'computeFee exported' : 'MISSING'
  });
} catch (e) {
  checks.push({ check: 'fees_model_exists', pass: false, detail: `Import error: ${e.message}` });
}

// CHECK 7: slippage_model.mjs exists
try {
  const slipMod = await import(path.join(ROOT, 'core/cost/slippage_model.mjs'));
  checks.push({
    check: 'slippage_model_exists',
    pass: typeof slipMod.computeSlippage === 'function',
    detail: typeof slipMod.computeSlippage === 'function' ? 'computeSlippage exported' : 'MISSING'
  });
} catch (e) {
  checks.push({ check: 'slippage_model_exists', pass: false, detail: `Import error: ${e.message}` });
}

// CHECK 8: funding_model.mjs exists
try {
  const fundMod = await import(path.join(ROOT, 'core/cost/funding_model.mjs'));
  checks.push({
    check: 'funding_model_exists',
    pass: typeof fundMod.computeFunding === 'function',
    detail: typeof fundMod.computeFunding === 'function' ? 'computeFunding exported' : 'MISSING'
  });
} catch (e) {
  checks.push({ check: 'funding_model_exists', pass: false, detail: `Import error: ${e.message}` });
}

// CHECK 9: Contract JSON exists
const contractPath = path.join(ROOT, 'artifacts/contracts/COST_MODEL_CONTRACT_v2.json');
try {
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  checks.push({
    check: 'contract_json_exists',
    pass: contract.version === '2.0.0' && Array.isArray(contract.required_fields),
    detail: `version=${contract.version}, fields=${contract.required_fields?.length}`
  });
} catch (e) {
  checks.push({ check: 'contract_json_exists', pass: false, detail: `Error: ${e.message}` });
}

// Summary
const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'REALISM01_CONTRACT_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_REALISM01_COST_CONTRACT.md'), [
  '# REGRESSION_REALISM01_COST_CONTRACT.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map(c => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_realism01_cost_contract.json'), {
  schema_version: '1.0.0',
  gate_id: GATE_ID,
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_realism01_cost_contract — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
