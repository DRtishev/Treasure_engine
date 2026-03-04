/**
 * regression_fill01_probe_contract.mjs — RG_FILL01: Fill Probe Contract
 *
 * Verifies:
 *   1. FillProbe constructor rejects null adapter
 *   2. FillProbe.probe returns FILLED for filled orders
 *   3. FillProbe.probe returns CANCELLED for cancelled orders
 *   4. FillProbe.probe returns TIMEOUT when maxPolls exceeded
 *   5. Circuit breaker opens after consecutive failures
 *   6. Slippage calculation correct for BUY/SELL
 *   7. Diagnostics track probe history
 *
 * Write-scope: reports/evidence/EXECUTOR/gates/manual/regression_fill01_probe_contract.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { FillProbe } from '../../core/exec/fill_probe.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:fast';
const checks = [];

// Mock adapter factory
function mockAdapter(statusSequence) {
  let callIndex = 0;
  return {
    getOrderStatus(orderId) {
      const status = statusSequence[Math.min(callIndex, statusSequence.length - 1)];
      callIndex++;
      return Promise.resolve(status);
    },
  };
}

// ─── Check 1: Constructor rejects null adapter ───
try {
  new FillProbe(null);
  checks.push({ check: 'FILL01_CONSTRUCTOR_REJECTS_NULL', pass: false, detail: 'FAIL: did not throw' });
} catch (e) {
  checks.push({ check: 'FILL01_CONSTRUCTOR_REJECTS_NULL', pass: true, detail: `OK: ${e.message}` });
}

// ─── Check 2: Probe returns FILLED ───
{
  const adapter = mockAdapter([
    { filled: false },
    { filled: true, avgPrice: 50100, filledQty: 0.5, latency: 50 },
  ]);
  const probe = new FillProbe(adapter, { maxPolls: 5, pollIntervalMs: 1 });
  const result = await probe.probe('order1', { expectedPrice: 50000, side: 'BUY' });
  const pass = result.status === 'FILLED' && result.fill_price === 50100 && result.fill_qty === 0.5;
  checks.push({
    check: 'FILL01_PROBE_FILLED',
    pass,
    detail: pass ? `OK: status=${result.status} price=${result.fill_price} qty=${result.fill_qty}` : `FAIL: ${JSON.stringify(result)}`,
  });
}

// ─── Check 3: Probe returns CANCELLED ───
{
  const adapter = mockAdapter([
    { cancelled: true, reason: 'INSUFFICIENT_FUNDS' },
  ]);
  const probe = new FillProbe(adapter, { maxPolls: 5, pollIntervalMs: 1 });
  const result = await probe.probe('order2');
  const pass = result.status === 'CANCELLED' && result.reason === 'INSUFFICIENT_FUNDS';
  checks.push({
    check: 'FILL01_PROBE_CANCELLED',
    pass,
    detail: pass ? `OK: status=${result.status} reason=${result.reason}` : `FAIL: ${JSON.stringify(result)}`,
  });
}

// ─── Check 4: Probe returns TIMEOUT ───
{
  const adapter = mockAdapter([{ filled: false }]);
  const probe = new FillProbe(adapter, { maxPolls: 3, pollIntervalMs: 1 });
  const result = await probe.probe('order3');
  const pass = result.status === 'TIMEOUT' && result.polls === 3;
  checks.push({
    check: 'FILL01_PROBE_TIMEOUT',
    pass,
    detail: pass ? `OK: status=${result.status} polls=${result.polls}` : `FAIL: ${JSON.stringify(result)}`,
  });
}

// ─── Check 5: Circuit breaker opens after consecutive failures ───
{
  const adapter = mockAdapter([
    { cancelled: true, reason: 'FAIL1' },
    { cancelled: true, reason: 'FAIL2' },
    { cancelled: true, reason: 'FAIL3' },
  ]);
  const probe = new FillProbe(adapter, { maxPolls: 1, pollIntervalMs: 1, circuitBreakerLimit: 3 });
  await probe.probe('fail1');
  await probe.probe('fail2');
  await probe.probe('fail3');
  const result = await probe.probe('fail4');
  const pass = result.status === 'ERROR' && result.reason.includes('Circuit breaker');
  checks.push({
    check: 'FILL01_CIRCUIT_BREAKER',
    pass,
    detail: pass ? `OK: circuit breaker triggered after 3 failures` : `FAIL: ${JSON.stringify(result)}`,
  });
}

// ─── Check 6: Slippage calculation correct ───
{
  const adapter = mockAdapter([
    { filled: true, avgPrice: 50100, filledQty: 1 },
  ]);
  const probe = new FillProbe(adapter, { maxPolls: 5, pollIntervalMs: 1 });
  const buyResult = await probe.probe('slip1', { expectedPrice: 50000, side: 'BUY' });
  // 100 / 50000 * 10000 = 20 bps
  const buySlipOk = Math.abs(buyResult.slippage_bps - 20) < 0.01;

  const adapter2 = mockAdapter([
    { filled: true, avgPrice: 49900, filledQty: 1 },
  ]);
  const probe2 = new FillProbe(adapter2, { maxPolls: 5, pollIntervalMs: 1 });
  const sellResult = await probe2.probe('slip2', { expectedPrice: 50000, side: 'SELL' });
  // (50000-49900) / 50000 * 10000 = 20 bps
  const sellSlipOk = Math.abs(sellResult.slippage_bps - 20) < 0.01;

  const pass = buySlipOk && sellSlipOk;
  checks.push({
    check: 'FILL01_SLIPPAGE_CALC',
    pass,
    detail: pass
      ? `OK: buy_slip=${buyResult.slippage_bps}bps sell_slip=${sellResult.slippage_bps}bps`
      : `FAIL: buy_slip=${buyResult.slippage_bps} sell_slip=${sellResult.slippage_bps}`,
  });
}

// ─── Check 7: Diagnostics track history ───
{
  const adapter = mockAdapter([
    { filled: true, avgPrice: 50000, filledQty: 1 },
  ]);
  const probe = new FillProbe(adapter, { maxPolls: 5, pollIntervalMs: 1 });
  await probe.probe('diag1');
  await probe.probe('diag2');
  const diag = probe.getDiagnostics();
  const pass = diag.total_probes === 2 && diag.filled === 2 && !diag.circuit_breaker_open;
  checks.push({
    check: 'FILL01_DIAGNOSTICS',
    pass,
    detail: pass
      ? `OK: total=${diag.total_probes} filled=${diag.filled} cb=${diag.circuit_breaker_open}`
      : `FAIL: ${JSON.stringify(diag)}`,
  });
}

// ─── Verdict ───
const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_FILL01_VIOLATION';

for (const c of checks) {
  console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`);
}

writeMd(path.join(EXEC, 'REGRESSION_FILL01_PROBE_CONTRACT.md'), [
  '# RG_FILL01_PROBE_CONTRACT', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`,
  `CHECKS_TOTAL: ${checks.length}`,
  `VIOLATIONS: ${failed.length}`, '',
  '## CHECKS',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map(c => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_fill01_probe_contract.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_FILL01_PROBE_CONTRACT',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  checks,
  failed_checks: failed.map(c => c.check),
});

console.log(`[${status}] RG_FILL01_PROBE_CONTRACT — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
