/**
 * regression_profit_e2e_ks01.mjs — E2E: Kill Switch FLATTEN → orders blocked
 *
 * Sprint 5b: Prove that when kill switch triggers FLATTEN, MasterExecutor
 * blocks all subsequent order placements.
 *
 * Flow:
 *   1. Create MasterExecutor with safety_loop + LiveAdapterDryRun
 *   2. Trigger FLATTEN via dangerous metrics
 *   3. Attempt executeIntent → MUST be rejected
 *   4. Verify error message contains kill switch reference
 *
 * Gate ID : RG_PROFIT_E2E_KS01
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

const GATE_ID = 'RG_PROFIT_E2E_KS01';
const NEXT_ACTION = 'npm run -s verify:deep';

const checks = [];

try {
  const { MasterExecutor } = await import(path.join(ROOT, 'core/exec/master_executor.mjs'));
  const { createLiveAdapterDryRun } = await import(path.join(ROOT, 'core/exec/adapters/live_adapter_dryrun.mjs'));
  const { createSafetyLoop } = await import(path.join(ROOT, 'core/live/safety_loop.mjs'));

  const matrix = JSON.parse(fs.readFileSync(path.join(ROOT, 'specs/kill_switch_matrix.json'), 'utf8'));

  // --- Setup: create safety loop with DANGEROUS metrics ---
  let flattenFired = false;
  const safetyLoop = createSafetyLoop({
    matrix,
    metricsProvider: () => ({
      max_drawdown: 0.10,   // 10% → exceeds 5% threshold → FLATTEN
      reality_gap: 0,
      exchange_error_rate: 0,
      consecutive_losses: 0,
    }),
    onFlatten: () => { flattenFired = true; },
    clock: { now: () => 1000000 },
  });

  // Trigger the kill switch
  const evalResult = safetyLoop.evaluate();

  checks.push({
    check: 'flatten_triggered',
    pass: evalResult.triggered && evalResult.action === 'FLATTEN' && flattenFired,
    detail: evalResult.triggered
      ? `FLATTEN triggered, onFlatten called=${flattenFired}`
      : `NOT triggered: action=${evalResult.action}`,
  });

  // --- Create MasterExecutor with the triggered safety loop ---
  const adapter = createLiveAdapterDryRun();
  const executor = new MasterExecutor({
    adapter,
    safetyLoop,
    enable_reconciliation: false,
    enable_persistence: false,
    enable_events: false,
  });

  // --- Attempt to place an order → should be BLOCKED ---
  const intent = {
    side: 'BUY',
    size: 0.001,
    price: 50000,
    type: 'MARKET',
    symbol: 'BTC/USDT',
  };

  const execCtx = {
    run_id: 'e2e_ks01',
    hack_id: 'HACK_KS_01',
    mode: 'test',
    bar_idx: 0,
    order_seq: 0,
    bar: { t_ms: 1000000 },
  };

  const result = await executor.executeIntent(intent, execCtx);

  checks.push({
    check: 'order_blocked',
    pass: result.success === false,
    detail: result.success === false
      ? 'Order correctly REJECTED when kill switch active'
      : 'FAIL: order should have been rejected',
  });

  checks.push({
    check: 'error_mentions_kill_switch',
    pass: result.errors.some(e => /kill.?switch/i.test(e)),
    detail: result.errors.some(e => /kill.?switch/i.test(e))
      ? `Error: "${result.errors[0]}"`
      : `FAIL: no kill switch mention in errors: ${JSON.stringify(result.errors)}`,
  });

  checks.push({
    check: 'no_fills',
    pass: result.fills.length === 0,
    detail: result.fills.length === 0 ? 'No fills (correct)' : `FAIL: ${result.fills.length} fills`,
  });

  // --- Verify: after reset, orders go through ---
  safetyLoop.reset();
  const resultAfterReset = await executor.executeIntent(intent, {
    ...execCtx,
    order_seq: 1,
    bar: { t_ms: 2000000 },
  });

  checks.push({
    check: 'orders_resume_after_reset',
    pass: resultAfterReset.order_id !== null,
    detail: resultAfterReset.order_id
      ? `Order placed after reset: ${resultAfterReset.order_id}`
      : 'FAIL: order still blocked after reset',
  });
} catch (e) {
  checks.push({ check: 'e2e_execution', pass: false, detail: `Error: ${e.message}` });
}

// --- Summary ---
const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'E2E_KS01_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_PROFIT_E2E_KS01.md'), [
  '# REGRESSION_PROFIT_E2E_KS01.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map(c => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_profit_e2e_ks01.json'), {
  schema_version: '1.0.0',
  gate_id: GATE_ID,
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_profit_e2e_ks01 — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
