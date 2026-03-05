/**
 * regression_profit_e2e_sizer02_enforced.mjs — E2E: Position Sizer enforcement in executor path
 *
 * Sprint 5c: Prove that position sizer is applied in the real execution path
 * and rejects oversized/invalid orders without side-effects (no fills, no orders placed).
 *
 * Flow:
 *   1. Oversized order → rejected, no side-effects
 *   2. Invalid tier → rejected cleanly
 *   3. SafetyLoop REDUCE → tier downgrade enforced in executor
 *   4. Valid order within enforced tier → accepted
 *
 * Gate ID : RG_PROFIT_SIZER02_ENFORCED
 * Wired   : verify:deep (Sprint 5c)
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_PROFIT_SIZER02_ENFORCED';
const NEXT_ACTION = 'npm run -s verify:deep';

const checks = [];

try {
  const { MasterExecutor } = await import(path.join(ROOT, 'core/exec/master_executor.mjs'));
  const { createLiveAdapterDryRun } = await import(path.join(ROOT, 'core/exec/adapters/live_adapter_dryrun.mjs'));
  const { createSafetyLoop } = await import(path.join(ROOT, 'core/live/safety_loop.mjs'));

  const matrix = JSON.parse(fs.readFileSync(path.join(ROOT, 'specs/kill_switch_matrix.json'), 'utf8'));

  const adapter = createLiveAdapterDryRun();

  const execCtx = {
    run_id: 'e2e_sizer02',
    hack_id: 'HACK_SIZER02',
    mode: 'test',
    bar_idx: 0,
    order_seq: 0,
    bar: { t_ms: 1000000 },
  };

  // --- TEST 1: Oversized order → rejected, no side-effects ---
  const executor1 = new MasterExecutor({
    adapter,
    positionSizerTier: 'micro',
    equity: 100000,
    enable_reconciliation: false,
    enable_persistence: false,
    enable_events: false,
  });

  const oversized = {
    side: 'BUY',
    size: 5.0,     // 5 BTC >> micro tier max (~0.1 BTC)
    price: 50000,
    type: 'MARKET',
    symbol: 'BTC/USDT',
  };

  const r1 = await executor1.executeIntent(oversized, execCtx);
  const stats1 = executor1.getStats();

  checks.push({
    check: 'oversized_rejected_no_sideeffects',
    pass: r1.success === false && r1.fills.length === 0 && stats1.orders_placed === 0,
    detail: `success=${r1.success}, fills=${r1.fills.length}, orders_placed=${stats1.orders_placed}`,
  });

  checks.push({
    check: 'rejection_error_is_clear',
    pass: r1.errors.some(e => /tier/i.test(e) || /sizer/i.test(e) || /exceeds/i.test(e)),
    detail: r1.errors[0] || 'no error',
  });

  // --- TEST 2: Invalid tier → rejected cleanly ---
  const executor2 = new MasterExecutor({
    adapter,
    positionSizerTier: 'bogus_tier',
    equity: 100000,
    enable_reconciliation: false,
    enable_persistence: false,
    enable_events: false,
  });

  const validSizedIntent = {
    side: 'BUY',
    size: 0.001,
    price: 50000,
    type: 'MARKET',
    symbol: 'BTC/USDT',
  };

  const r2 = await executor2.executeIntent(validSizedIntent, {
    ...execCtx, order_seq: 1, bar: { t_ms: 2000000 },
  });

  checks.push({
    check: 'invalid_tier_rejected',
    pass: r2.success === false && r2.fills.length === 0,
    detail: `success=${r2.success}, error="${r2.errors[0] || 'none'}"`,
  });

  // --- TEST 3: SafetyLoop REDUCE → tier downgrade enforced in executor ---
  // REDUCE triggers when consecutive_losses >= 10 → tier goes to 'micro'
  const safetyLoop = createSafetyLoop({
    matrix,
    metricsProvider: () => ({
      max_drawdown: 0.01,       // below FLATTEN threshold
      reality_gap: 0.05,        // below PAUSE threshold
      exchange_error_rate: 0.01, // below PAUSE threshold
      consecutive_losses: 12,   // >= 10 → REDUCE → micro
    }),
    clock: { now: () => 1000000 },
  });

  // With auto-tick in executor, safetyLoop.evaluate() will be called automatically.
  // The REDUCE action sets tier to 'micro', and the executor should use this tier.
  const executor3 = new MasterExecutor({
    adapter,
    safetyLoop,
    positionSizerTier: 'normal',   // starts normal, but REDUCE will downgrade to micro
    equity: 100000,
    enable_reconciliation: false,
    enable_persistence: false,
    enable_events: false,
  });

  // This order is valid for 'normal' (5% of 100k = $5000 risk) but too large for 'micro'
  // micro: 0.1% of 100k = $100 risk. signal_risk=50000*0.02=$1000. max_size=100/1000=0.1 BTC
  const mediumIntent = {
    side: 'BUY',
    size: 0.5,     // 0.5 BTC > 0.1 micro max
    price: 50000,
    type: 'MARKET',
    symbol: 'BTC/USDT',
  };

  const r3 = await executor3.executeIntent(mediumIntent, {
    ...execCtx, order_seq: 2, bar: { t_ms: 3000000 },
  });

  checks.push({
    check: 'reduce_enforces_micro_tier',
    pass: r3.success === false && r3.errors.some(e => /tier/i.test(e) || /exceeds/i.test(e)),
    detail: `success=${r3.success}, error="${r3.errors[0] || 'none'}"`,
  });

  // Verify the safety loop state shows REDUCE happened
  const safetyState = safetyLoop.getState();
  checks.push({
    check: 'reduce_tier_is_micro',
    pass: safetyState.currentTier === 'micro',
    detail: `currentTier=${safetyState.currentTier}`,
  });

  // --- TEST 4: Valid order within enforced micro tier → accepted ---
  const tinyIntent = {
    side: 'BUY',
    size: 0.05,    // 0.05 BTC < 0.1 micro max → should pass
    price: 50000,
    type: 'MARKET',
    symbol: 'BTC/USDT',
  };

  const r4 = await executor3.executeIntent(tinyIntent, {
    ...execCtx, order_seq: 3, bar: { t_ms: 4000000 },
  });

  checks.push({
    check: 'valid_micro_order_accepted',
    pass: r4.order_id !== null,
    detail: r4.order_id
      ? `Order placed: ${r4.order_id}`
      : `FAIL: rejected: ${r4.errors.join(', ')}`,
  });
} catch (e) {
  checks.push({ check: 'e2e_execution', pass: false, detail: `Error: ${e.message}` });
}

// --- Summary ---
const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'SIZER02_ENFORCED_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_PROFIT_E2E_SIZER02_ENFORCED.md'), [
  '# REGRESSION_PROFIT_E2E_SIZER02_ENFORCED.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map(c => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_profit_e2e_sizer02_enforced.json'), {
  schema_version: '1.0.0',
  gate_id: GATE_ID,
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_profit_e2e_sizer02_enforced — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
