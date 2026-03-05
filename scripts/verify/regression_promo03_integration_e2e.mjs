/**
 * regression_promo03_integration_e2e.mjs -- RG_PROMO03_INTEGRATION_E2E
 *
 * Sprint 9 DEEP E2E: Run paper live loop and verify promotion_result
 * is returned with valid verdict (proving runtime wiring).
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { runPaperLiveLoop } from '../../core/paper/paper_live_runner.mjs';
import { VALID_VERDICTS } from '../../core/promotion/promotion_ladder.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_PROMO03_INTEGRATION_E2E';
const NEXT_ACTION = 'npm run -s verify:deep';
const checks = [];

// Create a deterministic feed with enough trades to be meaningful
const ticks = [];
for (let i = 0; i < 60; i++) {
  const base = 50000 + (i % 5) * 100 - 200;
  ticks.push({ symbol: 'BTCUSDT', price: base, ts: `2026-01-01T00:${String(i).padStart(2, '0')}:00Z` });
}

const feed = {
  _idx: 0,
  hasMore() { return this._idx < ticks.length; },
  next() { return ticks[this._idx++]; }
};

const result = runPaperLiveLoop(feed, {
  initial_capital: 10000,
  date: '2026-01-01',
  run_id: 'RG_PROMO03_TEST',
  stage: 'paper'
});

// Test 1: promotion_result exists
checks.push({
  check: 'promotion_result_exists',
  pass: result.promotion_result !== undefined && result.promotion_result !== null,
  detail: result.promotion_result ? 'promotion_result returned' : 'MISSING promotion_result'
});

// Test 2: promotion_result has valid verdict
if (result.promotion_result) {
  const pr = result.promotion_result;
  checks.push({
    check: 'verdict_is_valid',
    pass: VALID_VERDICTS.includes(pr.verdict),
    detail: `verdict=${pr.verdict}`
  });

  checks.push({
    check: 'has_criteria_results',
    pass: Array.isArray(pr.criteria_results),
    detail: `criteria_results count=${pr.criteria_results?.length}`
  });

  checks.push({
    check: 'has_reason_code',
    pass: typeof pr.reason_code === 'string' && pr.reason_code.length > 0,
    detail: `reason_code=${pr.reason_code}`
  });

  checks.push({
    check: 'has_evidence_summary',
    pass: typeof pr.evidence_summary === 'string' && pr.evidence_summary.length > 0,
    detail: `evidence_summary=${pr.evidence_summary.substring(0, 60)}`
  });

  checks.push({
    check: 'target_stage_is_micro_live',
    pass: pr.target_stage === 'micro_live',
    detail: `target_stage=${pr.target_stage}`
  });
}

// Test 3: paper loop completed normally
checks.push({
  check: 'loop_completed',
  pass: result.status === 'COMPLETED',
  detail: `status=${result.status}`
});

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'PROMO03_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_PROMO03_INTEGRATION_E2E.md'), [
  '# REGRESSION_PROMO03_INTEGRATION_E2E.md', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`, `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS', checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_promo03_integration_e2e.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code,
  run_id: RUN_ID, next_action: NEXT_ACTION, checks, failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_promo03_integration_e2e — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
