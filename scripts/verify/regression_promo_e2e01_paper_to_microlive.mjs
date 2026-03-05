/**
 * regression_promo_e2e01_paper_to_microlive.mjs -- RG_PROMO_E2E01
 *
 * Deep E2E: meets criteria -> PROMOTE_ELIGIBLE
 * Sprint 8 DEEP gate.
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { evaluatePromotion } from '../../core/promotion/promotion_ladder.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_PROMO_E2E01_PAPER_TO_MICROLIVE';
const NEXT_ACTION = 'npm run -s verify:deep';
const checks = [];

// Case 1: All criteria met -> PROMOTE_ELIGIBLE
const eligible = evaluatePromotion({
  current_stage: 'paper',
  metrics: {
    min_trades: 150,
    stability_window_days: 20,
    max_drawdown: 0.03,
    sharpe: 0.7,
    win_rate: 0.55
  }
});
checks.push({
  check: 'paper_all_met_eligible',
  pass: eligible.eligible === true && eligible.verdict === 'PROMOTE_ELIGIBLE',
  detail: `eligible=${eligible.eligible}, verdict=${eligible.verdict}`
});
checks.push({
  check: 'paper_target_micro_live',
  pass: eligible.target_stage === 'micro_live',
  detail: `target_stage=${eligible.target_stage}`
});

// Case 2: Criteria NOT met -> BLOCKED
const blocked = evaluatePromotion({
  current_stage: 'paper',
  metrics: {
    min_trades: 50,  // < 100
    stability_window_days: 20,
    max_drawdown: 0.03,
    sharpe: 0.7,
    win_rate: 0.55
  }
});
checks.push({
  check: 'paper_criteria_not_met_blocked',
  pass: blocked.eligible === false && blocked.verdict === 'BLOCKED',
  detail: `eligible=${blocked.eligible}, verdict=${blocked.verdict}`
});

// Case 3: Max stage -> BLOCKED (ALREADY_AT_MAX)
const maxStage = evaluatePromotion({
  current_stage: 'live',
  metrics: { min_trades: 1000 }
});
checks.push({
  check: 'live_already_at_max',
  pass: maxStage.eligible === false && maxStage.reason_code === 'ALREADY_AT_MAX_STAGE',
  detail: `reason_code=${maxStage.reason_code}`
});

// Case 4: micro_live -> small_live with good metrics
const microToSmall = evaluatePromotion({
  current_stage: 'micro_live',
  metrics: {
    min_trades: 300,
    stability_window_days: 10,
    max_drawdown: 0.02,
    sharpe: 1.0,
    robustness_score: 0.7
  }
});
checks.push({
  check: 'micro_to_small_eligible',
  pass: microToSmall.eligible === true && microToSmall.target_stage === 'small_live',
  detail: `eligible=${microToSmall.eligible}, target=${microToSmall.target_stage}`
});

// Case 5: Drawdown too high -> BLOCKED
const highDD = evaluatePromotion({
  current_stage: 'paper',
  metrics: {
    min_trades: 150,
    stability_window_days: 20,
    max_drawdown: 0.08,  // > 0.05
    sharpe: 0.7,
    win_rate: 0.55
  }
});
checks.push({
  check: 'high_drawdown_blocked',
  pass: highDD.eligible === false && highDD.verdict === 'BLOCKED',
  detail: `eligible=${highDD.eligible}, reason=${highDD.reason_code}`
});

// Summary
const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'PROMO_E2E01_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_PROMO_E2E01.md'), [
  '# REGRESSION_PROMO_E2E01.md', '', `STATUS: ${status}`, `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`, `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS', checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_promo_e2e01.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code,
  run_id: RUN_ID, next_action: NEXT_ACTION, checks, failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_promo_e2e01_paper_to_microlive — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
