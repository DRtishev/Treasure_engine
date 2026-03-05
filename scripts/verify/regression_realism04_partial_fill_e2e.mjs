/**
 * regression_realism04_partial_fill_e2e.mjs -- RG_REALISM04_PARTIAL_FILL_E2E
 *
 * Deep E2E: order > depth → fill_ratio < 1.0
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

const GATE_ID = 'RG_REALISM04_PARTIAL_FILL_E2E';
const NEXT_ACTION = 'npm run -s verify:deep';

const checks = [];

// Case 1: Small order, plenty of depth → fill_ratio = 1.0
const small = computeTotalCost({
  price: 50000, qty: 0.001, side: 'BUY', mode: 'backtest',
  market_context: { depth_usd: 1_000_000 }
});
checks.push({
  check: 'small_order_full_fill',
  pass: small.fill_ratio === 1.0,
  detail: `fill_ratio=${small.fill_ratio} (expected 1.0)`
});
checks.push({
  check: 'small_order_filled_qty',
  pass: small.filled_qty === 0.001,
  detail: `filled_qty=${small.filled_qty} (expected 0.001)`
});

// Case 2: Large order, limited depth → fill_ratio < 1.0
const large = computeTotalCost({
  price: 50000, qty: 10, side: 'BUY', mode: 'backtest',
  market_context: { depth_usd: 100_000 }
  // available_liquidity = 100_000 * 0.1 = 10_000
  // order_usd = 50000 * 10 = 500_000
  // fill_ratio = min(1, 10_000 / 500_000) = 0.02
});
checks.push({
  check: 'large_order_partial_fill',
  pass: large.fill_ratio < 1.0 && large.fill_ratio > 0,
  detail: `fill_ratio=${large.fill_ratio} (expected < 1.0)`
});
checks.push({
  check: 'large_order_filled_qty_reduced',
  pass: large.filled_qty < 10,
  detail: `filled_qty=${large.filled_qty} (expected < 10)`
});

// Case 3: No depth data → default fill_ratio = 0.95
const noDepth = computeTotalCost({
  price: 50000, qty: 0.1, side: 'BUY', mode: 'backtest',
  market_context: {}
});
checks.push({
  check: 'no_depth_default_fill_ratio',
  pass: noDepth.fill_ratio === 0.95,
  detail: `fill_ratio=${noDepth.fill_ratio} (expected 0.95)`
});

// Case 4: fee_usd computed on filled_qty (not raw qty)
const partial = computeTotalCost({
  price: 50000, qty: 10, side: 'BUY', mode: 'backtest',
  market_context: { depth_usd: 100_000 }
});
const fullFee = computeTotalCost({
  price: 50000, qty: 10, side: 'BUY', mode: 'backtest',
  market_context: { depth_usd: 100_000_000 }
});
checks.push({
  check: 'partial_fill_reduces_fee',
  pass: partial.fee_usd < fullFee.fee_usd,
  detail: `partial_fee=${partial.fee_usd} < full_fee=${fullFee.fee_usd}`
});

// Summary
const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'REALISM04_PARTIAL_FILL_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_REALISM04_PARTIAL_FILL_E2E.md'), [
  '# REGRESSION_REALISM04_PARTIAL_FILL_E2E.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_realism04_partial_fill_e2e.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code,
  run_id: RUN_ID, next_action: NEXT_ACTION, checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_realism04_partial_fill_e2e — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
