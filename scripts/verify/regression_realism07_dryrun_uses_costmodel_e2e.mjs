/**
 * regression_realism07_dryrun_uses_costmodel_e2e.mjs -- RG_REALISM07
 *
 * Sprint 9 DEEP E2E: Run e111 paper real-feed runner and verify
 * fills contain cost_model fields from computeTotalCost SSOT.
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { runPaperLiveRealFeed } from '../../core/paper/e111_paper_live_real_feed_runner.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_REALISM07_DRYRUN_USES_COSTMODEL_E2E';
const NEXT_ACTION = 'npm run -s verify:deep';
const checks = [];

// Create deterministic candles with enough variation
const candles = [];
for (let i = 0; i < 30; i++) {
  const variation = [0, 50, 100, -50, -100, 150, -150, 200, -200, 0];
  const price = 50000 + variation[i % variation.length];
  candles.push({ price, ts: `2026-01-01T00:${String(i).padStart(2, '0')}:00Z` });
}

const result = runPaperLiveRealFeed(candles, {
  initialCapital: 10000,
  maxTrades: 20,
  maxDailyLoss: 0.05,
  maxDrawdown: 0.10
});

checks.push({
  check: 'runner_produces_fills',
  pass: result.fills.length > 0,
  detail: `${result.fills.length} fills produced`
});

// Verify fills have cost_model metadata
if (result.fills.length > 0) {
  const firstFill = result.fills[0];
  checks.push({
    check: 'fill_has_cost_model',
    pass: firstFill.cost_model !== undefined,
    detail: firstFill.cost_model ? `cost_model: ${JSON.stringify(firstFill.cost_model)}` : 'MISSING cost_model'
  });

  if (firstFill.cost_model) {
    checks.push({
      check: 'cost_model_has_fee_bps',
      pass: typeof firstFill.cost_model.fee_bps === 'number',
      detail: `fee_bps=${firstFill.cost_model.fee_bps}`
    });
    checks.push({
      check: 'cost_model_has_slippage_bps',
      pass: typeof firstFill.cost_model.slippage_bps === 'number',
      detail: `slippage_bps=${firstFill.cost_model.slippage_bps}`
    });
    checks.push({
      check: 'cost_model_has_total_cost_bps',
      pass: typeof firstFill.cost_model.total_cost_bps === 'number',
      detail: `total_cost_bps=${firstFill.cost_model.total_cost_bps}`
    });
  }

  // All fills must have cost_model
  const allHaveCostModel = result.fills.every(f => f.cost_model !== undefined);
  checks.push({
    check: 'all_fills_have_cost_model',
    pass: allHaveCostModel,
    detail: allHaveCostModel ? `All ${result.fills.length} fills have cost_model` : 'Some fills missing cost_model'
  });
}

// Summary hash must exist
checks.push({
  check: 'summary_hash_present',
  pass: typeof result.summary.summary_hash === 'string' && result.summary.summary_hash.length > 0,
  detail: `hash=${result.summary.summary_hash?.substring(0, 16)}...`
});

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'REALISM07_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_REALISM07_DRYRUN_USES_COSTMODEL_E2E.md'), [
  '# REGRESSION_REALISM07_DRYRUN_USES_COSTMODEL_E2E.md', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`, `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS', checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_realism07_dryrun_uses_costmodel_e2e.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code,
  run_id: RUN_ID, next_action: NEXT_ACTION, checks, failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_realism07_dryrun_uses_costmodel_e2e — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
