/**
 * regression_profit_e2e_sizer01.mjs — E2E: Position Sizer tier violation → order rejected
 *
 * Sprint 5b: Prove that MasterExecutor rejects orders exceeding tier limits.
 *
 * Flow:
 *   1. Create MasterExecutor with positionSizerTier='micro' (0.1% of equity)
 *   2. Submit intent with size exceeding micro tier max
 *   3. Verify rejection with appropriate error
 *   4. Submit intent within tier limits → MUST succeed
 *
 * Gate ID : RG_PROFIT_E2E_SIZER01
 * Wired   : verify:deep (Sprint 5b)
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_PROFIT_E2E_SIZER01';
const NEXT_ACTION = 'npm run -s verify:deep';

const checks = [];

try {
  const { MasterExecutor } = await import(path.join(ROOT, 'core/exec/master_executor.mjs'));
  const { createLiveAdapterDryRun } = await import(path.join(ROOT, 'core/exec/adapters/live_adapter_dryrun.mjs'));

  const adapter = createLiveAdapterDryRun();

  // equity=100000, tier=micro → max_risk = 100000 * 0.001 = $100
  // signal_risk = price * 0.02 (default) = 50000 * 0.02 = $1000
  // max_size = max_risk / signal_risk = 100 / 1000 = 0.1 BTC
  const executor = new MasterExecutor({
    adapter,
    positionSizerTier: 'micro',
    equity: 100000,
    enable_reconciliation: false,
    enable_persistence: false,
    enable_events: false,
  });

  const execCtx = {
    run_id: 'e2e_sizer01',
    hack_id: 'HACK_SIZER_01',
    mode: 'test',
    bar_idx: 0,
    order_seq: 0,
    bar: { t_ms: 1000000 },
  };

  // --- TEST 1: Oversized order → REJECTED ---
  const oversizedIntent = {
    side: 'BUY',
    size: 1.0,   // 1 BTC >> 0.1 BTC max for micro tier
    price: 50000,
    type: 'MARKET',
    symbol: 'BTC/USDT',
  };

  const result1 = await executor.executeIntent(oversizedIntent, execCtx);

  checks.push({
    check: 'oversized_order_rejected',
    pass: result1.success === false,
    detail: result1.success === false
      ? 'Oversized order correctly REJECTED'
      : 'FAIL: oversized order should have been rejected',
  });

  checks.push({
    check: 'error_mentions_tier',
    pass: result1.errors.some(e => /tier/i.test(e) || /sizer/i.test(e)),
    detail: result1.errors.some(e => /tier/i.test(e) || /sizer/i.test(e))
      ? `Error: "${result1.errors[0]}"`
      : `FAIL: no tier/sizer mention: ${JSON.stringify(result1.errors)}`,
  });

  // --- TEST 2: Correctly sized order → ACCEPTED ---
  const validIntent = {
    side: 'BUY',
    size: 0.05,   // 0.05 BTC < 0.1 BTC max → within micro tier
    price: 50000,
    type: 'MARKET',
    symbol: 'BTC/USDT',
  };

  const result2 = await executor.executeIntent(validIntent, {
    ...execCtx,
    order_seq: 1,
    bar: { t_ms: 2000000 },
  });

  checks.push({
    check: 'valid_order_accepted',
    pass: result2.order_id !== null,
    detail: result2.order_id
      ? `Valid order placed: ${result2.order_id}`
      : 'FAIL: valid order should have been accepted',
  });

  // --- TEST 3: Unknown tier → REJECTED ---
  const badTierExecutor = new MasterExecutor({
    adapter,
    positionSizerTier: 'unknown_tier',
    equity: 100000,
    enable_reconciliation: false,
    enable_persistence: false,
    enable_events: false,
  });

  const result3 = await badTierExecutor.executeIntent(validIntent, {
    ...execCtx,
    order_seq: 2,
    bar: { t_ms: 3000000 },
  });

  checks.push({
    check: 'unknown_tier_rejected',
    pass: result3.success === false,
    detail: result3.success === false
      ? 'Unknown tier correctly REJECTED'
      : 'FAIL: unknown tier should have been rejected',
  });

  // --- TEST 4: REDUCE action downgrades tier ---
  const { createSafetyLoop } = await import(path.join(ROOT, 'core/live/safety_loop.mjs'));
  const matrix = JSON.parse(fs.readFileSync(path.join(ROOT, 'specs/kill_switch_matrix.json'), 'utf8'));

  const safetyLoop = createSafetyLoop({
    matrix,
    metricsProvider: () => ({
      max_drawdown: 0.01,
      reality_gap: 0.1,
      exchange_error_rate: 0.01,
      consecutive_losses: 12, // >=10 → REDUCE action → tier downgrade to micro
    }),
    clock: { now: () => 1000000 },
  });

  safetyLoop.evaluate();
  const state = safetyLoop.getState();

  checks.push({
    check: 'reduce_downgrades_to_micro',
    pass: state.currentTier === 'micro',
    detail: state.currentTier === 'micro'
      ? 'REDUCE action downgrades tier to micro'
      : `FAIL: expected micro, got ${state.currentTier}`,
  });
} catch (e) {
  checks.push({ check: 'e2e_execution', pass: false, detail: `Error: ${e.message}` });
}

// --- Summary ---
const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'E2E_SIZER01_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_PROFIT_E2E_SIZER01.md'), [
  '# REGRESSION_PROFIT_E2E_SIZER01.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map(c => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_profit_e2e_sizer01.json'), {
  schema_version: '1.0.0',
  gate_id: GATE_ID,
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_profit_e2e_sizer01 — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
