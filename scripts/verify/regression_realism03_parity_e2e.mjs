/**
 * regression_realism03_parity_e2e.mjs -- RG_REALISM03_PARITY_E2E
 *
 * Deep E2E: Same scenario → backtest and paper → identical cost fields via cost_model.
 * Sprint 7 DEEP gate.
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { computeTotalCost } from '../../core/cost/cost_model.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_REALISM03_PARITY_E2E';
const NEXT_ACTION = 'npm run -s verify:deep';

const checks = [];

// Scenario: 10 trades with varying parameters
const scenarios = [
  { price: 50000, qty: 0.01, side: 'BUY', order_type: 'TAKER' },
  { price: 50100, qty: 0.02, side: 'SELL', order_type: 'TAKER' },
  { price: 49900, qty: 0.005, side: 'BUY', order_type: 'MAKER' },
  { price: 51000, qty: 0.015, side: 'SELL', order_type: 'MAKER' },
  { price: 48000, qty: 0.03, side: 'BUY', order_type: 'TAKER' },
  { price: 52000, qty: 0.008, side: 'SELL', order_type: 'TAKER' },
  { price: 50500, qty: 0.012, side: 'BUY', order_type: 'MAKER' },
  { price: 49500, qty: 0.025, side: 'SELL', order_type: 'TAKER' },
  { price: 50200, qty: 0.007, side: 'BUY', order_type: 'TAKER' },
  { price: 49800, qty: 0.018, side: 'SELL', order_type: 'MAKER' },
];

const market_context = {
  spread_bps: 2.0,
  depth_usd: 500000,
  atr_pct: 0.02,
};

// Parity test: same input → same output regardless of mode
for (let i = 0; i < scenarios.length; i++) {
  const s = scenarios[i];

  const backtestResult = computeTotalCost({
    ...s, mode: 'backtest', market_context
  });
  const paperResult = computeTotalCost({
    ...s, mode: 'paper', market_context
  });

  // Compare all numeric fields
  const fields = ['fee_bps', 'fee_usd', 'slippage_bps', 'slippage_usd',
    'funding_bps', 'funding_usd', 'fill_ratio', 'filled_qty',
    'total_cost_bps', 'total_cost_usd', 'exec_price'];

  const diffs = fields.filter(f => backtestResult[f] !== paperResult[f]);

  checks.push({
    check: `parity_trade_${i + 1}`,
    pass: diffs.length === 0 && backtestResult.funding_status === paperResult.funding_status,
    detail: diffs.length === 0
      ? `${s.side} ${s.qty}@${s.price} — identical across modes`
      : `DIFF: ${diffs.map(f => `${f}: bt=${backtestResult[f]} paper=${paperResult[f]}`).join(', ')}`
  });
}

// Determinism test: same call twice → same result
const r1 = computeTotalCost({ price: 50000, qty: 0.01, side: 'BUY', mode: 'backtest', market_context });
const r2 = computeTotalCost({ price: 50000, qty: 0.01, side: 'BUY', mode: 'backtest', market_context });
const detFields = ['fee_bps', 'fee_usd', 'slippage_bps', 'slippage_usd', 'exec_price', 'fill_ratio'];
const detDiffs = detFields.filter(f => r1[f] !== r2[f]);
checks.push({
  check: 'determinism_x2',
  pass: detDiffs.length === 0,
  detail: detDiffs.length === 0 ? 'Identical results on x2 calls' : `DIFF: ${detDiffs.join(', ')}`
});

// Summary
const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'REALISM03_PARITY_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_REALISM03_PARITY_E2E.md'), [
  '# REGRESSION_REALISM03_PARITY_E2E.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_realism03_parity_e2e.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code,
  run_id: RUN_ID, next_action: NEXT_ACTION, checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_realism03_parity_e2e — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
