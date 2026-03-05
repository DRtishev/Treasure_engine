/**
 * regression_canary_e2e02_order_rate.mjs -- RG_CANARY_E2E02_ORDER_RATE_LIMIT
 *
 * Deep E2E: orders/min exceeded -> PAUSE
 * Sprint 8 DEEP gate.
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { evaluateCanary } from '../../core/promotion/canary_policy.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_CANARY_E2E02_ORDER_RATE_LIMIT';
const NEXT_ACTION = 'npm run -s verify:deep';
const checks = [];

// Case 1: Order rate exceeded (micro_live: max 5/min) -> PAUSE
const rateExceeded = evaluateCanary({
  metrics: { exposure_usd: 50, orders_per_min: 10, daily_loss_usd: 5 },
  stage: 'micro_live'
});
checks.push({
  check: 'order_rate_exceeded_pause',
  pass: rateExceeded.action === 'PAUSE',
  detail: `action=${rateExceeded.action}, reason=${rateExceeded.reason_code}`
});
checks.push({
  check: 'order_rate_orders_paused',
  pass: rateExceeded.new_state.ordersPaused === true,
  detail: `ordersPaused=${rateExceeded.new_state.ordersPaused}`
});

// Case 2: Order rate within limits -> CONTINUE
const rateOk = evaluateCanary({
  metrics: { exposure_usd: 50, orders_per_min: 3, daily_loss_usd: 5 },
  stage: 'micro_live'
});
checks.push({
  check: 'order_rate_ok_continue',
  pass: rateOk.action === 'CONTINUE',
  detail: `action=${rateOk.action}`
});

// Case 3: small_live with 15 orders/min (max 10) -> PAUSE
const smallLiveRate = evaluateCanary({
  metrics: { exposure_usd: 500, orders_per_min: 15, daily_loss_usd: 50 },
  stage: 'small_live'
});
checks.push({
  check: 'small_live_rate_pause',
  pass: smallLiveRate.action === 'PAUSE',
  detail: `action=${smallLiveRate.action}`
});

// Case 4: Exposure warning (> limit but < 1.5x) -> REDUCE
const exposureWarn = evaluateCanary({
  metrics: { exposure_usd: 120, orders_per_min: 3, daily_loss_usd: 5 },
  stage: 'micro_live'  // max 100
});
checks.push({
  check: 'exposure_warning_reduce',
  pass: exposureWarn.action === 'REDUCE',
  detail: `action=${exposureWarn.action}`
});

// Case 5: Violation severity correct
const violation = rateExceeded.violations.find(v => v.limit_name === 'max_orders_per_min');
checks.push({
  check: 'order_rate_violation_severity',
  pass: violation && violation.severity === 'CRITICAL',
  detail: `severity=${violation?.severity}`
});

// Summary
const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'CANARY_E2E02_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_CANARY_E2E02.md'), [
  '# REGRESSION_CANARY_E2E02.md', '', `STATUS: ${status}`, `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`, `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS', checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_canary_e2e02.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code,
  run_id: RUN_ID, next_action: NEXT_ACTION, checks, failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_canary_e2e02_order_rate — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
