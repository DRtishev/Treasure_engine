/**
 * regression_canary03_integration_e2e.mjs -- RG_CANARY03_INTEGRATION_E2E
 *
 * Sprint 9 DEEP E2E: Run paper live loop with metrics that breach canary
 * limits and verify orders are actually blocked.
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { runPaperLiveLoop } from '../../core/paper/paper_live_runner.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_CANARY03_INTEGRATION_E2E';
const NEXT_ACTION = 'npm run -s verify:deep';
const checks = [];

// Create a feed with enough ticks to generate trades
const ticks = [];
for (let i = 0; i < 60; i++) {
  const base = 50000 + (i % 5) * 100 - 200;
  ticks.push({ symbol: 'BTCUSDT', price: base, ts: `2026-01-01T00:${String(i).padStart(2, '0')}:00Z` });
}

// Test 1: Run with micro_live stage and very tight canary limits
// to ensure canary triggers and blocks orders
const feed1 = {
  _idx: 0,
  hasMore() { return this._idx < ticks.length; },
  next() { return ticks[this._idx++]; }
};

const resultWithCanary = runPaperLiveLoop(feed1, {
  initial_capital: 10000,
  date: '2026-01-01',
  run_id: 'RG_CANARY03_TEST_BREACH',
  stage: 'micro_live',
  canary_limits: {
    max_exposure_usd: 1,        // Very tight — will trigger quickly
    max_orders_per_min: 1,      // Very tight
    max_daily_loss_usd: 0.01,   // Very tight
    max_daily_loss_pct: 0.0001, // Very tight
    max_open_positions: 1
  }
});

// Canary events must have been generated
checks.push({
  check: 'canary_events_generated',
  pass: resultWithCanary.canary_events.length > 0,
  detail: `${resultWithCanary.canary_events.length} canary events`
});

// At least one canary event should have PAUSE or FLATTEN action
if (resultWithCanary.canary_events.length > 0) {
  const hasBlockingAction = resultWithCanary.canary_events.some(
    e => e.action === 'PAUSE' || e.action === 'FLATTEN'
  );
  checks.push({
    check: 'canary_has_blocking_action',
    pass: hasBlockingAction,
    detail: `actions: ${[...new Set(resultWithCanary.canary_events.map(e => e.action))].join(', ')}`
  });

  checks.push({
    check: 'canary_event_has_reason_code',
    pass: typeof resultWithCanary.canary_events[0].reason_code === 'string',
    detail: `reason_code=${resultWithCanary.canary_events[0].reason_code}`
  });
}

// canary_state should show orders paused
checks.push({
  check: 'canary_state_orders_paused',
  pass: resultWithCanary.canary_state.ordersPaused === true,
  detail: `ordersPaused=${resultWithCanary.canary_state.ordersPaused}`
});

// Test 2: Run without canary (stage=paper) — more fills should happen
const feed2 = {
  _idx: 0,
  hasMore() { return this._idx < ticks.length; },
  next() { return ticks[this._idx++]; }
};

const resultNoCanary = runPaperLiveLoop(feed2, {
  initial_capital: 10000,
  date: '2026-01-01',
  run_id: 'RG_CANARY03_TEST_NOCANARY',
  stage: 'paper'
});

checks.push({
  check: 'no_canary_events_in_paper_stage',
  pass: resultNoCanary.canary_events.length === 0,
  detail: `canary_events=${resultNoCanary.canary_events.length}`
});

// Paper mode should produce more fills than canary-limited mode
checks.push({
  check: 'canary_reduces_fills',
  pass: resultNoCanary.fills_count >= resultWithCanary.fills_count,
  detail: `paper=${resultNoCanary.fills_count} vs canary=${resultWithCanary.fills_count}`
});

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'CANARY03_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_CANARY03_INTEGRATION_E2E.md'), [
  '# REGRESSION_CANARY03_INTEGRATION_E2E.md', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`, `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS', checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_canary03_integration_e2e.json'), {
  schema_version: '1.0.0', gate_id: GATE_ID, status, reason_code,
  run_id: RUN_ID, next_action: NEXT_ACTION, checks, failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_canary03_integration_e2e — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
