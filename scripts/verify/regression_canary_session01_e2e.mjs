/**
 * regression_canary_session01_e2e.mjs -- RG_CANARY_SESSION01
 *
 * Sprint 12 DEEP gate:
 * 1. Run micro_live scenario with tight canary limits
 * 2. Verify canary fires PAUSE or FLATTEN
 * 3. Verify orders are blocked after canary triggers
 * 4. Generate per-session receipt with canary event log
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { runPaperLiveLoop } from '../../core/paper/paper_live_runner.mjs';
import { getLedgerSummary, getEquity } from '../../core/profit/ledger.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_CANARY_SESSION01';
const NEXT_ACTION = 'npm run -s verify:deep';
const checks = [];

// Build feed with price moves that will generate fills and losses
const ticks = [];
for (let i = 0; i < 100; i++) {
  // Price drops steadily to trigger daily loss canary
  const price = 50000 - i * 50;
  ticks.push({
    symbol: 'BTCUSDT',
    price,
    ts: `2026-01-01T00:${String(i).padStart(2, '0')}:00Z`
  });
}

const feed = {
  _idx: 0,
  hasMore() { return this._idx < ticks.length; },
  next() { return ticks[this._idx++]; }
};

// Run with micro_live stage and very tight canary limits
const result = runPaperLiveLoop(feed, {
  initial_capital: 10000,
  date: '2026-01-01',
  run_id: 'RG_CANARY_SESSION01_TEST',
  stage: 'micro_live',
  canary_limits: {
    max_exposure_usd: 50,
    max_daily_loss_usd: 0.01,
    max_orders_per_min: 2,
    max_daily_loss_pct: 0.0001
  }
});

// Check 1: Loop completes
checks.push({
  check: 'session_completes',
  pass: result.status === 'COMPLETED' || result.status === 'PANIC_EXIT',
  detail: `status=${result.status}, ticks=${result.ticks_processed}`
});

// Check 2: Canary events fired
checks.push({
  check: 'canary_events_fired',
  pass: result.canary_events.length > 0,
  detail: `${result.canary_events.length} canary events`
});

// Check 3: At least one PAUSE or FLATTEN action
const pauseFlatten = result.canary_events.filter(e => e.action === 'PAUSE' || e.action === 'FLATTEN');
checks.push({
  check: 'canary_pause_or_flatten',
  pass: pauseFlatten.length > 0,
  detail: pauseFlatten.length > 0
    ? `${pauseFlatten.length} PAUSE/FLATTEN events, first at tick ${pauseFlatten[0].tick}`
    : 'NO PAUSE/FLATTEN events — canary did not enforce'
});

// Check 4: Orders were blocked (fewer fills than without canary)
// With 100 ticks and tight limits, most orders should be blocked
checks.push({
  check: 'orders_blocked_by_canary',
  pass: result.fills_count < 50,
  detail: `fills=${result.fills_count} out of 100 ticks (canary should block most)`
});

// Check 5: Promotion result still returned
checks.push({
  check: 'promotion_result_present',
  pass: result.promotion_result !== undefined && result.promotion_result !== null,
  detail: result.promotion_result ? `verdict=${result.promotion_result.verdict}` : 'MISSING'
});

// Check 6: Canary state tracked
checks.push({
  check: 'canary_state_tracked',
  pass: result.canary_state !== undefined,
  detail: `ordersPaused=${result.canary_state?.ordersPaused}`
});

// Generate per-session receipt
const receiptDir = path.join(ROOT, 'reports/evidence/EPOCH-V2-S12-CANARY');
fs.mkdirSync(receiptDir, { recursive: true });

const lastPrice = ticks[ticks.length - 1].price;
const prices = { BTCUSDT: lastPrice };
const summary = getLedgerSummary(result.ledger, prices);
const equity = getEquity(result.ledger, prices);

const receiptMd = [
  '# SESSION_RECEIPT — Sprint 12 Canary E2E',
  '',
  '## Session Info',
  `- **Run ID:** RG_CANARY_SESSION01_TEST`,
  `- **Stage:** micro_live`,
  `- **Status:** ${result.status}`,
  `- **Ticks Processed:** ${result.ticks_processed}`,
  `- **Total Fills:** ${result.fills_count}`,
  '',
  '## Canary Configuration',
  '- max_exposure_usd: 50',
  '- max_daily_loss_usd: 0.01',
  '- max_orders_per_min: 2',
  '- max_daily_loss_pct: 0.01%',
  '',
  '## Canary Events',
  `- **Total Events:** ${result.canary_events.length}`,
  `- **PAUSE/FLATTEN:** ${pauseFlatten.length}`,
  '',
  ...result.canary_events.slice(0, 10).map((e, i) =>
    `${i + 1}. tick=${e.tick} action=${e.action} reason=${e.reason_code} violations=${JSON.stringify(e.violations)}`
  ),
  result.canary_events.length > 10 ? `... and ${result.canary_events.length - 10} more` : '',
  '',
  '## Ledger Summary',
  `- **Initial Capital:** ${result.ledger.initial_capital}`,
  `- **Final Equity:** ${equity.toFixed(4)}`,
  `- **Realized PnL:** ${result.ledger.realized_pnl.toFixed(4)}`,
  `- **Total Fees:** ${result.ledger.total_fees.toFixed(4)}`,
  `- **Max Drawdown:** ${(result.ledger.max_drawdown * 100).toFixed(2)}%`,
  '',
  '## Promotion Result',
  `- **Verdict:** ${result.promotion_result ? result.promotion_result.verdict : 'N/A'}`,
  `- **Eligible:** ${result.promotion_result ? result.promotion_result.eligible : 'N/A'}`,
  ''
].join('\n');

fs.writeFileSync(path.join(receiptDir, 'SESSION_RECEIPT_CANARY_E2E.md'), receiptMd, 'utf8');

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'CANARY_SESSION01_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_CANARY_SESSION01_E2E.md'), [
  '# REGRESSION_CANARY_SESSION01_E2E.md', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`, `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_canary_session01_e2e.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code,
  run_id: RUN_ID, next_action: NEXT_ACTION, checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_canary_session01_e2e — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
