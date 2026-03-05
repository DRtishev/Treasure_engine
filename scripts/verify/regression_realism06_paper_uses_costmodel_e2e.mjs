/**
 * regression_realism06_paper_uses_costmodel_e2e.mjs -- RG_REALISM06
 *
 * Sprint 9 DEEP E2E: Run paper live loop and verify fills contain
 * cost_model fields (exec_price, fee from SSOT computeTotalCost).
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { runPaperLiveLoop, paperExecute } from '../../core/paper/paper_live_runner.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_REALISM06_PAPER_USES_COSTMODEL_E2E';
const NEXT_ACTION = 'npm run -s verify:deep';
const checks = [];

// Create a simple deterministic feed
const ticks = [];
for (let i = 0; i < 50; i++) {
  const base = 50000 + (i % 5) * 100 - 200;
  ticks.push({ symbol: 'BTCUSDT', price: base, ts: `2026-01-01T00:${String(i).padStart(2, '0')}:00Z` });
}

const feed = {
  _idx: 0,
  hasMore() { return this._idx < ticks.length; },
  next() { return ticks[this._idx++]; }
};

// Test 1: paperExecute returns cost_model fields
const fill = paperExecute(
  { symbol: 'BTCUSDT', price: 50000, ts: '2026-01-01T00:00:00Z' },
  'BUY',
  { max_position_usd: 5000 }
);

checks.push({
  check: 'fill_has_cost_model',
  pass: fill !== null && fill.cost_model !== undefined,
  detail: fill ? `cost_model present: ${JSON.stringify(fill.cost_model)}` : 'fill is null'
});

if (fill && fill.cost_model) {
  checks.push({
    check: 'cost_model_has_fee_bps',
    pass: typeof fill.cost_model.fee_bps === 'number',
    detail: `fee_bps=${fill.cost_model.fee_bps}`
  });
  checks.push({
    check: 'cost_model_has_slippage_bps',
    pass: typeof fill.cost_model.slippage_bps === 'number',
    detail: `slippage_bps=${fill.cost_model.slippage_bps}`
  });
  checks.push({
    check: 'cost_model_has_total_cost_bps',
    pass: typeof fill.cost_model.total_cost_bps === 'number',
    detail: `total_cost_bps=${fill.cost_model.total_cost_bps}`
  });
  checks.push({
    check: 'exec_price_from_ssot',
    pass: fill.exec_price !== fill.price,
    detail: `exec_price=${fill.exec_price} vs market=${fill.price}`
  });
}

// Test 2: Run full paper loop and verify it completes
const result = runPaperLiveLoop(feed, {
  initial_capital: 10000,
  date: '2026-01-01',
  run_id: 'RG_REALISM06_TEST'
});

checks.push({
  check: 'paper_loop_completes',
  pass: result.status === 'COMPLETED',
  detail: `status=${result.status}, fills=${result.fills_count}`
});

// Test 3: Verify fills in ledger have realistic exec_price (not equal to price)
const ledgerFills = result.ledger.fills;
if (ledgerFills.length > 0) {
  const allHaveExecPrice = ledgerFills.every(f => f.exec_price !== f.price);
  checks.push({
    check: 'ledger_fills_have_exec_price_offset',
    pass: allHaveExecPrice,
    detail: `${ledgerFills.length} fills checked, all have exec_price != price`
  });
}

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'REALISM06_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_REALISM06_PAPER_USES_COSTMODEL_E2E.md'), [
  '# REGRESSION_REALISM06_PAPER_USES_COSTMODEL_E2E.md', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`, `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS', checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_realism06_paper_uses_costmodel_e2e.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code,
  run_id: RUN_ID, next_action: NEXT_ACTION, checks, failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_realism06_paper_uses_costmodel_e2e — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
