/**
 * regression_profit_e2e_ks02_autotick.mjs — E2E: SafetyLoop auto-tick freshness
 *
 * Sprint 5c: Prove that MasterExecutor auto-evaluates the kill switch
 * WITHOUT any manual safetyLoop.evaluate() call from the test.
 *
 * Flow:
 *   1. Create MasterExecutor with SafetyLoop using dangerous metrics
 *   2. Do NOT call safetyLoop.evaluate() — executor must do it internally
 *   3. executeIntent → MUST be blocked by auto-ticked kill switch
 *   4. Switch metrics to safe + reset → orders resume
 *
 * Gate ID : RG_PROFIT_KS02_AUTOTICK
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

const GATE_ID = 'RG_PROFIT_KS02_AUTOTICK';
const NEXT_ACTION = 'npm run -s verify:deep';

const checks = [];

try {
  const { MasterExecutor } = await import(path.join(ROOT, 'core/exec/master_executor.mjs'));
  const { createLiveAdapterDryRun } = await import(path.join(ROOT, 'core/exec/adapters/live_adapter_dryrun.mjs'));
  const { createSafetyLoop } = await import(path.join(ROOT, 'core/live/safety_loop.mjs'));

  const matrix = JSON.parse(fs.readFileSync(path.join(ROOT, 'specs/kill_switch_matrix.json'), 'utf8'));

  // --- Setup: dangerous metrics that should trigger FLATTEN ---
  let dangerousMetrics = true;
  const safetyLoop = createSafetyLoop({
    matrix,
    metricsProvider: () => dangerousMetrics
      ? { max_drawdown: 0.10, reality_gap: 0, exchange_error_rate: 0, consecutive_losses: 0 }
      : { max_drawdown: 0, reality_gap: 0, exchange_error_rate: 0, consecutive_losses: 0 },
    clock: { now: () => 1000000 },
  });

  // KEY: we do NOT call safetyLoop.evaluate() here.
  // The executor's auto-tick must handle it.

  // Verify: before executor call, state should be clean (no evaluate called yet)
  const preState = safetyLoop.getState();
  checks.push({
    check: 'pre_state_clean',
    pass: preState.ordersPaused === false && preState.lastEvalTs === 0,
    detail: `paused=${preState.ordersPaused}, lastEvalTs=${preState.lastEvalTs}`,
  });

  const adapter = createLiveAdapterDryRun();
  const executor = new MasterExecutor({
    adapter,
    safetyLoop,
    enable_reconciliation: false,
    enable_persistence: false,
    enable_events: false,
  });

  const intent = {
    side: 'BUY',
    size: 0.001,
    price: 50000,
    type: 'MARKET',
    symbol: 'BTC/USDT',
  };

  const execCtx = {
    run_id: 'e2e_ks02',
    hack_id: 'HACK_KS02',
    mode: 'test',
    bar_idx: 0,
    order_seq: 0,
    bar: { t_ms: 1000000 },
  };

  // --- TEST 1: executor auto-ticks, detects danger, blocks order ---
  const result = await executor.executeIntent(intent, execCtx);

  checks.push({
    check: 'auto_tick_blocked_order',
    pass: result.success === false,
    detail: result.success === false
      ? 'Order correctly BLOCKED by auto-tick (no manual evaluate)'
      : 'FAIL: order should have been blocked',
  });

  checks.push({
    check: 'error_mentions_kill_switch',
    pass: result.errors.some(e => /kill.?switch/i.test(e)),
    detail: result.errors.some(e => /kill.?switch/i.test(e))
      ? `Error: "${result.errors[0]}"`
      : `FAIL: ${JSON.stringify(result.errors)}`,
  });

  // Verify: after executor call, safetyLoop state should show evaluation happened
  const postState = safetyLoop.getState();
  checks.push({
    check: 'evaluate_was_called',
    pass: postState.lastEvalTs > 0 && postState.ordersPaused === true,
    detail: `lastEvalTs=${postState.lastEvalTs}, paused=${postState.ordersPaused}`,
  });

  checks.push({
    check: 'no_fills',
    pass: result.fills.length === 0,
    detail: result.fills.length === 0 ? 'No fills (correct)' : `FAIL: ${result.fills.length} fills`,
  });

  // --- TEST 2: switch to safe metrics + reset → orders resume ---
  dangerousMetrics = false;
  safetyLoop.reset();

  const result2 = await executor.executeIntent(intent, {
    ...execCtx,
    order_seq: 1,
    bar: { t_ms: 2000000 },
  });

  checks.push({
    check: 'safe_metrics_order_accepted',
    pass: result2.order_id !== null,
    detail: result2.order_id
      ? `Order placed after safe metrics: ${result2.order_id}`
      : `FAIL: order still blocked: ${result2.errors.join(', ')}`,
  });
} catch (e) {
  checks.push({ check: 'e2e_execution', pass: false, detail: `Error: ${e.message}` });
}

// --- Summary ---
const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'KS02_AUTOTICK_FAIL';

writeMd(path.join(EXEC, 'REGRESSION_PROFIT_E2E_KS02_AUTOTICK.md'), [
  '# REGRESSION_PROFIT_E2E_KS02_AUTOTICK.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map(c => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_profit_e2e_ks02_autotick.json'), {
  schema_version: '1.0.0',
  gate_id: GATE_ID,
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] regression_profit_e2e_ks02_autotick — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
