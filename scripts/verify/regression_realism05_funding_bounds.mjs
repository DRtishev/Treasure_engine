/**
 * regression_realism05_funding_bounds.mjs -- RG_REALISM05_FUNDING_BOUNDS
 *
 * Deep E2E: holding > 1 period → funding_cost > 0, status = BOUNDS_ESTIMATE
 * Sprint 7 DEEP gate.
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { computeTotalCost } from '../../core/cost/cost_model.mjs';
import { computeFunding } from '../../core/cost/funding_model.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_REALISM05_FUNDING_BOUNDS';
const NEXT_ACTION = 'npm run -s verify:deep';

const checks = [];

// Case 1: No holding → funding = 0, status = KNOWN
const noHold = computeTotalCost({
  price: 50000, qty: 0.1, side: 'BUY', mode: 'backtest',
  market_context: { holding_periods: 0 }
});
checks.push({
  check: 'no_holding_zero_funding',
  pass: noHold.funding_usd === 0 && noHold.funding_bps === 0,
  detail: `funding_usd=${noHold.funding_usd}, funding_bps=${noHold.funding_bps}`
});

// Case 2: Holding 3 periods, no known rate → BOUNDS_ESTIMATE, funding > 0
const holdDefault = computeTotalCost({
  price: 50000, qty: 0.1, side: 'BUY', mode: 'backtest',
  market_context: { holding_periods: 3 }
});
checks.push({
  check: 'holding_default_rate_positive',
  pass: holdDefault.funding_usd > 0 && holdDefault.funding_bps > 0,
  detail: `funding_usd=${holdDefault.funding_usd}, funding_bps=${holdDefault.funding_bps}`
});
checks.push({
  check: 'holding_default_status_bounds',
  pass: holdDefault.funding_status === 'BOUNDS_ESTIMATE',
  detail: `funding_status=${holdDefault.funding_status}`
});

// Case 3: Known rate → KNOWN status
const holdKnown = computeTotalCost({
  price: 50000, qty: 0.1, side: 'BUY', mode: 'backtest',
  market_context: { holding_periods: 2, funding_rate_bps: 3 }
});
checks.push({
  check: 'known_rate_status',
  pass: holdKnown.funding_status === 'KNOWN',
  detail: `funding_status=${holdKnown.funding_status}`
});
checks.push({
  check: 'known_rate_positive',
  pass: holdKnown.funding_usd > 0,
  detail: `funding_usd=${holdKnown.funding_usd}`
});

// Case 4: Out-of-bounds rate → INSUFFICIENT_EVIDENCE, worst-case
const holdOOB = computeFunding({
  position_usd: 5000, holding_periods: 2,
  market_context: { funding_rate_bps: 50 }  // > max 15
});
checks.push({
  check: 'oob_rate_insufficient_evidence',
  pass: holdOOB.funding_status === 'INSUFFICIENT_EVIDENCE',
  detail: `funding_status=${holdOOB.funding_status}`
});
checks.push({
  check: 'oob_rate_worst_case',
  pass: holdOOB.funding_bps === 30,  // 15 * 2
  detail: `funding_bps=${holdOOB.funding_bps} (expected 30 = 15*2)`
});

// Case 5: Negative rate (short pays funding) → KNOWN
const negRate = computeFunding({
  position_usd: 5000, holding_periods: 1,
  market_context: { funding_rate_bps: -3 }
});
checks.push({
  check: 'negative_rate_known',
  pass: negRate.funding_status === 'KNOWN',
  detail: `funding_status=${negRate.funding_status}, bps=${negRate.funding_bps}`
});

// Summary
const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'REALISM05_FUNDING_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_REALISM05_FUNDING_BOUNDS.md'), [
  '# REGRESSION_REALISM05_FUNDING_BOUNDS.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_realism05_funding_bounds.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code,
  run_id: RUN_ID, next_action: NEXT_ACTION, checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_realism05_funding_bounds — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
