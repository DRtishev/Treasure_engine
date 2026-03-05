/**
 * regression_canary_e2e01_daily_loss.mjs -- RG_CANARY_E2E01_DAILY_LOSS_TRIGGER
 *
 * Deep E2E: daily loss exceeded -> FLATTEN
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

const GATE_ID = 'RG_CANARY_E2E01_DAILY_LOSS_TRIGGER';
const NEXT_ACTION = 'npm run -s verify:deep';
const checks = [];

// Case 1: Daily loss exceeded (micro_live: max $10) -> FLATTEN
const lossExceeded = evaluateCanary({
  metrics: { exposure_usd: 50, orders_per_min: 2, daily_loss_usd: 15 },
  stage: 'micro_live'
});
checks.push({
  check: 'daily_loss_usd_flatten',
  pass: lossExceeded.action === 'FLATTEN',
  detail: `action=${lossExceeded.action}, reason=${lossExceeded.reason_code}`
});
checks.push({
  check: 'daily_loss_orders_paused',
  pass: lossExceeded.new_state.ordersPaused === true,
  detail: `ordersPaused=${lossExceeded.new_state.ordersPaused}`
});

// Case 2: Daily loss percentage exceeded -> FLATTEN
const lossPctExceeded = evaluateCanary({
  metrics: { exposure_usd: 50, orders_per_min: 2, daily_loss_usd: 5, daily_loss_pct: 0.05 },
  stage: 'micro_live'  // max 0.02
});
checks.push({
  check: 'daily_loss_pct_flatten',
  pass: lossPctExceeded.action === 'FLATTEN',
  detail: `action=${lossPctExceeded.action}`
});

// Case 3: Daily loss within limits -> CONTINUE
const lossOk = evaluateCanary({
  metrics: { exposure_usd: 50, orders_per_min: 2, daily_loss_usd: 5 },
  stage: 'micro_live'
});
checks.push({
  check: 'daily_loss_ok_continue',
  pass: lossOk.action === 'CONTINUE',
  detail: `action=${lossOk.action}`
});

// Case 4: small_live with $150 loss (max $100) -> FLATTEN
const smallLiveLoss = evaluateCanary({
  metrics: { exposure_usd: 500, orders_per_min: 5, daily_loss_usd: 150 },
  stage: 'small_live'
});
checks.push({
  check: 'small_live_loss_flatten',
  pass: smallLiveLoss.action === 'FLATTEN',
  detail: `action=${smallLiveLoss.action}`
});

// Case 5: Violation detected in violations array
checks.push({
  check: 'violation_recorded',
  pass: lossExceeded.violations.length > 0 && lossExceeded.violations.some(v => v.limit_name === 'max_daily_loss_usd'),
  detail: `violations=${lossExceeded.violations.length}`
});

// Summary
const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'CANARY_E2E01_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_CANARY_E2E01.md'), [
  '# REGRESSION_CANARY_E2E01.md', '', `STATUS: ${status}`, `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`, `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS', checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_canary_e2e01.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code,
  run_id: RUN_ID, next_action: NEXT_ACTION, checks, failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_canary_e2e01_daily_loss — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
