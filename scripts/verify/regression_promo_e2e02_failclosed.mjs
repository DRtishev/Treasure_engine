/**
 * regression_promo_e2e02_failclosed.mjs -- RG_PROMO_E2E02_FAILCLOSED_UNCERTAINTY
 *
 * Deep E2E: missing metrics -> INSUFFICIENT_DATA / PAUSE
 * Sprint 8 DEEP gate.
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { evaluatePromotion } from '../../core/promotion/promotion_ladder.mjs';
import { evaluateCanary } from '../../core/promotion/canary_policy.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_PROMO_E2E02_FAILCLOSED_UNCERTAINTY';
const NEXT_ACTION = 'npm run -s verify:deep';
const checks = [];

// Case 1: Promotion with missing metric -> INSUFFICIENT_DATA
const missingMetric = evaluatePromotion({
  current_stage: 'paper',
  metrics: {
    min_trades: 150,
    // stability_window_days: MISSING
    max_drawdown: 0.03,
    sharpe: 0.7,
    win_rate: 0.55
  }
});
checks.push({
  check: 'promotion_missing_metric_insufficient',
  pass: missingMetric.verdict === 'INSUFFICIENT_DATA' && missingMetric.eligible === false,
  detail: `verdict=${missingMetric.verdict}, reason=${missingMetric.reason_code}`
});

// Case 2: Promotion with all undefined -> INSUFFICIENT_DATA
const allMissing = evaluatePromotion({
  current_stage: 'paper',
  metrics: {}
});
checks.push({
  check: 'promotion_all_missing_insufficient',
  pass: allMissing.verdict === 'INSUFFICIENT_DATA',
  detail: `verdict=${allMissing.verdict}`
});

// Case 3: Canary with missing exposure -> PAUSE
const canaryMissing = evaluateCanary({
  metrics: { orders_per_min: 2, daily_loss_usd: 5 },
  // exposure_usd: MISSING
  stage: 'micro_live'
});
checks.push({
  check: 'canary_missing_exposure_pause',
  pass: canaryMissing.action === 'PAUSE' && canaryMissing.reason_code === 'MISSING_METRIC_FAILCLOSED',
  detail: `action=${canaryMissing.action}, reason=${canaryMissing.reason_code}`
});

// Case 4: Canary with missing daily_loss -> PAUSE
const canaryMissingLoss = evaluateCanary({
  metrics: { exposure_usd: 50, orders_per_min: 2 },
  // daily_loss_usd: MISSING
  stage: 'micro_live'
});
checks.push({
  check: 'canary_missing_daily_loss_pause',
  pass: canaryMissingLoss.action === 'PAUSE',
  detail: `action=${canaryMissingLoss.action}`
});

// Case 5: Canary with all required -> CONTINUE (control)
const canaryOk = evaluateCanary({
  metrics: { exposure_usd: 50, orders_per_min: 2, daily_loss_usd: 5 },
  stage: 'micro_live'
});
checks.push({
  check: 'canary_complete_metrics_continue',
  pass: canaryOk.action === 'CONTINUE',
  detail: `action=${canaryOk.action}`
});

// Summary
const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'PROMO_E2E02_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_PROMO_E2E02.md'), [
  '# REGRESSION_PROMO_E2E02.md', '', `STATUS: ${status}`, `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`, `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS', checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_promo_e2e02.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code,
  run_id: RUN_ID, next_action: NEXT_ACTION, checks, failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_promo_e2e02_failclosed — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
