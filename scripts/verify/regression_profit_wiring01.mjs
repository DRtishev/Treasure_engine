/**
 * regression_profit_wiring01.mjs — RG_PROFIT_WIRING01
 *
 * Gate: Verify profit lane safety infrastructure is wired (not mock-only).
 *
 * Checks:
 *   1. safety_loop.mjs exists and exports createSafetyLoop
 *   2. safety_loop imports evaluateKillSwitch from kill_switch.mjs
 *   3. safety_loop calls onFlatten/onPause/onReduce
 *   4. position sizer computePositionSize callable with correct tiers
 *   5. kill switch + safety loop integration: FLATTEN → ordersPaused=true
 *   6. reconciliation engine detects drift (already gated, but verify wiring)
 *
 * Gate ID : RG_PROFIT_WIRING01
 * Wired   : verify:fast (Sprint 5+)
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const GATE_ID = 'RG_PROFIT_WIRING01';
const NEXT_ACTION = 'npm run -s verify:fast';

const checks = [];

// --- CHECK 1: safety_loop.mjs exists and exports createSafetyLoop ---
let safetyLoopModule = null;
try {
  safetyLoopModule = await import(path.join(ROOT, 'core/live/safety_loop.mjs'));
  checks.push({
    check: 'safety_loop_exists',
    pass: typeof safetyLoopModule.createSafetyLoop === 'function',
    detail: typeof safetyLoopModule.createSafetyLoop === 'function'
      ? 'createSafetyLoop is exported function'
      : 'createSafetyLoop NOT found',
  });
} catch (e) {
  checks.push({ check: 'safety_loop_exists', pass: false, detail: `Import error: ${e.message}` });
}

// --- CHECK 2: safety_loop imports evaluateKillSwitch ---
const safetyLoopSrc = fs.existsSync(path.join(ROOT, 'core/live/safety_loop.mjs'))
  ? fs.readFileSync(path.join(ROOT, 'core/live/safety_loop.mjs'), 'utf8')
  : '';
checks.push({
  check: 'safety_loop_imports_kill_switch',
  pass: /import\s*\{[^}]*evaluateKillSwitch[^}]*\}\s*from/.test(safetyLoopSrc),
  detail: /import\s*\{[^}]*evaluateKillSwitch[^}]*\}\s*from/.test(safetyLoopSrc)
    ? 'imports evaluateKillSwitch from kill_switch.mjs'
    : 'MISSING: evaluateKillSwitch import',
});

// --- CHECK 3: safety_loop calls onFlatten/onPause/onReduce ---
checks.push({
  check: 'safety_loop_calls_flatten',
  pass: /onFlatten\s*\(/.test(safetyLoopSrc),
  detail: /onFlatten\s*\(/.test(safetyLoopSrc)
    ? 'calls onFlatten()'
    : 'MISSING: onFlatten() call',
});
checks.push({
  check: 'safety_loop_calls_pause',
  pass: /onPause\s*\(/.test(safetyLoopSrc),
  detail: /onPause\s*\(/.test(safetyLoopSrc)
    ? 'calls onPause()'
    : 'MISSING: onPause() call',
});
checks.push({
  check: 'safety_loop_calls_reduce',
  pass: /onReduce\s*\(/.test(safetyLoopSrc),
  detail: /onReduce\s*\(/.test(safetyLoopSrc)
    ? 'calls onReduce()'
    : 'MISSING: onReduce() call',
});

// --- CHECK 4: Functional integration test: FLATTEN → ordersPaused ---
try {
  const { createSafetyLoop } = safetyLoopModule || {};
  if (typeof createSafetyLoop === 'function') {
    const ksModule = await import(path.join(ROOT, 'core/risk/kill_switch.mjs'));
    const matrixPath = path.join(ROOT, 'specs/kill_switch_matrix.json');
    const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

    let flattenCalled = false;

    const loop = createSafetyLoop({
      matrix,
      metricsProvider: () => ({ max_drawdown: 0.1, reality_gap: 0, exchange_error_rate: 0, consecutive_losses: 0 }),
      onFlatten: () => { flattenCalled = true; },
      clock: { now: () => 1000000 },
    });

    const result = loop.evaluate();
    const state = loop.getState();

    checks.push({
      check: 'ks_flatten_triggers_orders_paused',
      pass: result.triggered && result.action === 'FLATTEN' && state.ordersPaused === true && flattenCalled,
      detail: result.triggered && result.action === 'FLATTEN' && state.ordersPaused === true && flattenCalled
        ? 'FLATTEN triggers → ordersPaused=true + onFlatten called'
        : `FAIL: triggered=${result.triggered} action=${result.action} paused=${state.ordersPaused} flatten=${flattenCalled}`,
    });

    // CHECK 4b: Safe metrics → no trigger
    const safeLoop = createSafetyLoop({
      matrix,
      metricsProvider: () => ({ max_drawdown: 0.01, reality_gap: 0.1, exchange_error_rate: 0.01, consecutive_losses: 2 }),
      clock: { now: () => 1000000 },
    });
    const safeResult = safeLoop.evaluate();
    checks.push({
      check: 'ks_safe_metrics_no_trigger',
      pass: !safeResult.triggered,
      detail: !safeResult.triggered ? 'Safe metrics → no trigger ✓' : `FAIL: triggered=${safeResult.triggered}`,
    });

    // CHECK 4c: PAUSE trigger
    let pauseCalled = false;
    const pauseLoop = createSafetyLoop({
      matrix,
      metricsProvider: () => ({ max_drawdown: 0.01, reality_gap: 0.5, exchange_error_rate: 0.01, consecutive_losses: 0 }),
      onPause: () => { pauseCalled = true; },
      clock: { now: () => 1000000 },
    });
    const pauseResult = pauseLoop.evaluate();
    checks.push({
      check: 'ks_pause_triggers_orders_paused',
      pass: pauseResult.triggered && pauseResult.action === 'PAUSE' && pauseCalled,
      detail: pauseResult.triggered && pauseResult.action === 'PAUSE' && pauseCalled
        ? 'PAUSE triggers → onPause called ✓'
        : `FAIL: triggered=${pauseResult.triggered} action=${pauseResult.action}`,
    });
  } else {
    checks.push({ check: 'ks_flatten_triggers_orders_paused', pass: false, detail: 'createSafetyLoop not available' });
  }
} catch (e) {
  checks.push({ check: 'ks_functional_test', pass: false, detail: `Error: ${e.message}` });
}

// --- CHECK 5: Position sizer integration (functional) ---
try {
  const { computePositionSize } = await import(path.join(ROOT, 'core/risk/position_sizer.mjs'));

  // micro: $100k equity, $10 risk → $100 max risk, size=10
  const micro = computePositionSize(100000, 'micro', 10);
  checks.push({
    check: 'sizer_micro_correct',
    pass: micro.size === 10 && micro.max_risk_usd === 100,
    detail: micro.size === 10 ? `micro: size=${micro.size}, max_risk=$${micro.max_risk_usd} ✓` : `FAIL: size=${micro.size}`,
  });

  // unknown tier → rejected
  const unknown = computePositionSize(100000, 'unknown_tier', 10);
  checks.push({
    check: 'sizer_unknown_tier_rejected',
    pass: unknown.size === 0,
    detail: unknown.size === 0 ? 'Unknown tier → size=0 (rejected) ✓' : `FAIL: size=${unknown.size}`,
  });
} catch (e) {
  checks.push({ check: 'sizer_functional', pass: false, detail: `Error: ${e.message}` });
}

// --- CHECK 6: Reconciliation still functional ---
try {
  const { reconcile } = await import(path.join(ROOT, 'core/recon/reconcile_v1.mjs'));

  // Drift detection
  const driftResult = reconcile(
    [{ order_id: 'O1', price: 100, size: 1 }],
    [{ order_id: 'O1', price: 115, size: 1 }],
    0.01,
  );
  checks.push({
    check: 'recon_detects_drift',
    pass: !driftResult.ok && driftResult.drifts.length > 0,
    detail: !driftResult.ok ? `Drift detected: ${driftResult.drifts.length} drift(s) ✓` : 'FAIL: no drift detected',
  });

  // Clean match
  const cleanResult = reconcile(
    [{ order_id: 'O1', price: 100, size: 1 }],
    [{ order_id: 'O1', price: 100, size: 1 }],
    0.01,
  );
  checks.push({
    check: 'recon_clean_match',
    pass: cleanResult.ok,
    detail: cleanResult.ok ? 'Clean match → ok=true ✓' : 'FAIL: expected ok=true',
  });
} catch (e) {
  checks.push({ check: 'recon_functional', pass: false, detail: `Error: ${e.message}` });
}

// --- Summary ---
const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'PROFIT_WIRING01_INCOMPLETE';

writeMd(path.join(EXEC, 'REGRESSION_PROFIT_WIRING01.md'), [
  '# REGRESSION_PROFIT_WIRING01.md', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_profit_wiring01.json'), {
  schema_version: '1.0.0',
  gate_id: GATE_ID,
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_profit_wiring01 — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
