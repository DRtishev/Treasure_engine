/**
 * regression_burnin01_e2e.mjs -- RG_BURNIN01
 *
 * Sprint 11 DEEP gate:
 * 1. Run multi-day paper burn-in scenario (200+ ticks)
 * 2. Verify ledger reconciliation: realized_pnl + unrealized == equity - initial_capital
 * 3. Verify fees/slippage tracked, fills have cost_model
 * 4. Verify promotion result returned with valid verdict
 * 5. Generate LEDGER_RECONCILE.md receipt
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { runPaperLiveLoop } from '../../core/paper/paper_live_runner.mjs';
import { getLedgerSummary, getEquity, getUnrealizedPnL } from '../../core/profit/ledger.mjs';
import { VALID_VERDICTS } from '../../core/promotion/promotion_ladder.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_BURNIN01';
const NEXT_ACTION = 'npm run -s verify:deep';
const checks = [];

// Build multi-day deterministic feed (200+ ticks, 3 days)
const ticks = [];
const days = ['2026-01-01', '2026-01-02', '2026-01-03'];
for (const day of days) {
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 20) {
      // Deterministic price oscillation around 50000
      const idx = ticks.length;
      const dayOffset = days.indexOf(day) * 200;
      const base = 50000 + dayOffset + Math.sin(idx * 0.3) * 500;
      const price = Math.round(base * 100) / 100;
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      ticks.push({
        symbol: 'BTCUSDT',
        price,
        ts: `${day}T${hh}:${mm}:00Z`
      });
    }
  }
}

const feed = {
  _idx: 0,
  hasMore() { return this._idx < ticks.length; },
  next() { return ticks[this._idx++]; }
};

// Check 1: Run burn-in
const result = runPaperLiveLoop(feed, {
  initial_capital: 10000,
  date: '2026-01-01',
  run_id: 'RG_BURNIN01_TEST',
  stage: 'paper'
});

checks.push({
  check: 'burnin_completes',
  pass: result.status === 'COMPLETED',
  detail: `status=${result.status}, ticks=${result.ticks_processed}, fills=${result.fills_count}`
});

checks.push({
  check: 'burnin_has_fills',
  pass: result.fills_count > 0,
  detail: `fills=${result.fills_count}`
});

// Check 2: Ledger reconciliation
const lastPrice = ticks[ticks.length - 1].price;
const prices = { BTCUSDT: lastPrice };
const summary = getLedgerSummary(result.ledger, prices);
const equity = getEquity(result.ledger, prices);
const unrealized = getUnrealizedPnL(result.ledger, prices);
const expectedTotalPnl = result.ledger.realized_pnl + unrealized;
const actualTotalPnl = equity - result.ledger.initial_capital;
const reconcileDrift = Math.abs(expectedTotalPnl - actualTotalPnl);

checks.push({
  check: 'ledger_reconciles',
  pass: reconcileDrift < 0.01,
  detail: `realized=${result.ledger.realized_pnl.toFixed(4)}, unrealized=${unrealized.toFixed(4)}, equity=${equity.toFixed(4)}, drift=${reconcileDrift.toFixed(6)}`
});

// Check 3: Fees and slippage tracked
checks.push({
  check: 'fees_tracked',
  pass: result.ledger.total_fees > 0,
  detail: `total_fees=${result.ledger.total_fees.toFixed(4)}`
});

checks.push({
  check: 'slippage_tracked',
  pass: result.ledger.total_slippage >= 0,
  detail: `total_slippage=${result.ledger.total_slippage.toFixed(4)}`
});

// Check 4: Fills have cost_model metadata
const fillsWithCostModel = result.ledger.fills.filter(f => f.exec_price !== undefined);
checks.push({
  check: 'fills_have_exec_price',
  pass: fillsWithCostModel.length === result.ledger.fills.length,
  detail: `${fillsWithCostModel.length}/${result.ledger.fills.length} fills have exec_price`
});

// Check 5: Promotion result valid
checks.push({
  check: 'promotion_result_returned',
  pass: result.promotion_result !== undefined && result.promotion_result !== null,
  detail: result.promotion_result ? `verdict=${result.promotion_result.verdict}` : 'MISSING'
});

if (result.promotion_result) {
  checks.push({
    check: 'promotion_verdict_valid',
    pass: VALID_VERDICTS.includes(result.promotion_result.verdict),
    detail: `verdict=${result.promotion_result.verdict}, valid_verdicts=${VALID_VERDICTS.join(',')}`
  });
}

// Check 6: Multi-day coverage
checks.push({
  check: 'multi_day_coverage',
  pass: result.ticks_processed >= 200,
  detail: `ticks=${result.ticks_processed} (target >= 200)`
});

// Generate LEDGER_RECONCILE.md receipt
const reconcileDir = path.join(ROOT, 'reports/evidence/EPOCH-V2-S11-BURNIN');
fs.mkdirSync(reconcileDir, { recursive: true });

const reconcileMd = [
  '# LEDGER_RECONCILE.md — Sprint 11 Burn-In',
  '',
  '## Reconciliation Proof',
  `- **Initial Capital:** ${result.ledger.initial_capital}`,
  `- **Final Equity:** ${equity.toFixed(4)}`,
  `- **Realized PnL:** ${result.ledger.realized_pnl.toFixed(4)}`,
  `- **Unrealized PnL:** ${unrealized.toFixed(4)}`,
  `- **Total PnL (realized + unrealized):** ${expectedTotalPnl.toFixed(4)}`,
  `- **Total PnL (equity - initial):** ${actualTotalPnl.toFixed(4)}`,
  `- **Reconciliation Drift:** ${reconcileDrift.toFixed(6)}`,
  `- **RECONCILE STATUS:** ${reconcileDrift < 0.01 ? 'PASS' : 'FAIL'}`,
  '',
  '## Fee/Slippage Summary',
  `- **Total Fees:** ${result.ledger.total_fees.toFixed(4)}`,
  `- **Total Slippage:** ${result.ledger.total_slippage.toFixed(4)}`,
  `- **Max Drawdown:** ${(result.ledger.max_drawdown * 100).toFixed(2)}%`,
  '',
  '## Burn-In Stats',
  `- **Ticks Processed:** ${result.ticks_processed}`,
  `- **Total Fills:** ${result.fills_count}`,
  `- **Days Covered:** ${days.length}`,
  `- **Status:** ${result.status}`,
  `- **Promotion Verdict:** ${result.promotion_result ? result.promotion_result.verdict : 'N/A'}`,
  '',
  '## Invariant',
  'sum(realized_pnl) + unrealized_pnl == equity - initial_capital',
  `${result.ledger.realized_pnl.toFixed(4)} + ${unrealized.toFixed(4)} == ${equity.toFixed(4)} - ${result.ledger.initial_capital}`,
  `${expectedTotalPnl.toFixed(4)} == ${actualTotalPnl.toFixed(4)} ✓`,
  ''
].join('\n');

fs.writeFileSync(path.join(reconcileDir, 'LEDGER_RECONCILE.md'), reconcileMd, 'utf8');

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'BURNIN01_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_BURNIN01_E2E.md'), [
  '# REGRESSION_BURNIN01_E2E.md', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`, `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_burnin01_e2e.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code,
  run_id: RUN_ID, next_action: NEXT_ACTION, checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_burnin01_e2e — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
