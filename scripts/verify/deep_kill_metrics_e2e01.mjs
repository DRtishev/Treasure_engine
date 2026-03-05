/**
 * deep_kill_metrics_e2e01.mjs — RG_KILL_METRICS_E2E01
 *
 * RADICAL-LITE R1 deep gate: Kill metrics are real (not zeros) after trading activity.
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const checks = [];

try {
  const { MasterExecutor } = await import('../../core/exec/master_executor.mjs');
  const { RiskGovernorState } = await import('../../core/risk/risk_governor.mjs');

  // Create risk governor with some equity and simulate drawdown
  const riskState = new RiskGovernorState({}, 0);
  riskState.updateEquity(10000);
  riskState.updateEquity(9500); // 5% drawdown

  const mockAdapter = {
    getName: () => 'MockAdapter',
    placeOrder: async () => ({ order_id: 'ord_1', status: 'NEW' }),
    pollOrder: async () => ({ status: 'FILLED', fills: [{ fill_id: 'f1', price: 100, qty: 1, fee: 0.01, timestamp: 1000 }], filled_qty: 1, filled_price: 100, fee: 0.01 }),
  };

  const executor = new MasterExecutor({
    adapter: mockAdapter,
    riskGovernor: riskState,
    enable_reconciliation: false,
    enable_persistence: false,
    enable_events: false,
  });

  // Simulate some losses for consecutive_losses
  executor.trackFillOutcome(-10);
  executor.trackFillOutcome(-5);
  executor.trackFillOutcome(-3);

  // Simulate exchange errors
  executor.recordExchangeError();
  executor.stats.orders_placed = 10; // simulate 10 orders

  const metrics = executor.getKillSwitchMetrics();

  // Check 1: max_drawdown is non-zero (reflects real drawdown)
  const p1 = metrics.max_drawdown > 0;
  checks.push({ check: 'max_drawdown_non_zero', pass: p1,
    detail: p1 ? `OK: max_drawdown=${metrics.max_drawdown}` : `FAIL: max_drawdown=${metrics.max_drawdown}` });

  // Check 2: consecutive_losses is non-zero (3 losses tracked)
  const p2 = metrics.consecutive_losses === 3;
  checks.push({ check: 'consecutive_losses_tracked', pass: p2,
    detail: p2 ? `OK: consecutive_losses=${metrics.consecutive_losses}` : `FAIL: consecutive_losses=${metrics.consecutive_losses}` });

  // Check 3: exchange_error_rate is non-zero
  const p3 = metrics.exchange_error_rate > 0;
  checks.push({ check: 'exchange_error_rate_non_zero', pass: p3,
    detail: p3 ? `OK: exchange_error_rate=${metrics.exchange_error_rate}` : `FAIL: exchange_error_rate=${metrics.exchange_error_rate}` });

  // Check 4: Winning trade resets consecutive losses
  executor.trackFillOutcome(50);
  const metrics2 = executor.getKillSwitchMetrics();
  const p4 = metrics2.consecutive_losses === 0;
  checks.push({ check: 'win_resets_losses', pass: p4,
    detail: p4 ? 'OK: win resets consecutive_losses to 0' : `FAIL: consecutive_losses=${metrics2.consecutive_losses}` });

  // Check 5: drawdown magnitude is correct (~5%)
  const expectedDD = (10000 - 9500) / 10000; // 0.05
  const p5 = Math.abs(metrics.max_drawdown - expectedDD) < 0.001;
  checks.push({ check: 'drawdown_magnitude_correct', pass: p5,
    detail: p5 ? `OK: drawdown=${metrics.max_drawdown} ≈ ${expectedDD}` : `FAIL: drawdown=${metrics.max_drawdown}, expected=${expectedDD}` });

} catch (err) {
  checks.push({ check: 'e2e_execution', pass: false, detail: `FAIL: ${err.message}` });
}

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_KILL_METRICS_E2E01_VIOLATION';

writeMd(path.join(EXEC, 'DEEP_KILL_METRICS_E2E01.md'), [
  '# RG_KILL_METRICS_E2E01: Real Kill Metrics E2E', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`,
  `CHECKS: ${checks.length}`, `VIOLATIONS: ${failed.length}`, '',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'deep_kill_metrics_e2e01.json'), {
  schema_version: '1.0.0', gate_id: 'RG_KILL_METRICS_E2E01', status, reason_code, run_id: RUN_ID, checks,
});

console.log(`[${status}] deep_kill_metrics_e2e01 — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
