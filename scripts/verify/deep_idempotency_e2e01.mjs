/**
 * deep_idempotency_e2e01.mjs — RG_IDEMPOTENCY_E2E01
 *
 * RADICAL-LITE R1 deep gate: Intent idempotency E2E test.
 * Uses in-memory mock repoState to test dedup logic without SQLite.
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

  // In-memory mock repoState (mimics DB behavior without better-sqlite3)
  const intentStore = new Map();
  const mockRepoState = {
    createIntent(intent) {
      if (intentStore.has(intent.intent_id)) {
        return { created: false, intent: intentStore.get(intent.intent_id) };
      }
      intentStore.set(intent.intent_id, intent);
      return { created: true, intent };
    },
    getIntent(id) { return intentStore.get(id) || null; },
    saveCheckpoint() {},
    loadCheckpoint() { return null; },
  };

  // Mock adapter
  let orderCount = 0;
  const mockAdapter = {
    getName: () => 'MockAdapter',
    placeOrder: async () => { orderCount++; return { order_id: `ord_${orderCount}`, status: 'NEW' }; },
    pollOrder: async (orderId) => ({ order_id: orderId, status: 'FILLED', fills: [{ fill_id: 'f1', price: 100, qty: 1, fee: 0.01, timestamp: 1000 }], filled_qty: 1, filled_price: 100, fee: 0.01 }),
  };

  const executor = new MasterExecutor({
    adapter: mockAdapter,
    repoState: mockRepoState,
    enable_reconciliation: false,
    enable_persistence: true,
    enable_events: false,
  });

  const intent = { intent_id: 'test_intent_001', side: 'BUY', size: 1, symbol: 'BTCUSDT', price: 100 };

  // First execution — should succeed
  const r1 = await executor.executeIntent(intent, { hack_id: 'test', bar_idx: 0 });
  const firstSucceeded = r1.success === true;
  checks.push({ check: 'first_intent_succeeds', pass: firstSucceeded,
    detail: firstSucceeded ? 'OK: first intent executed' : `FAIL: success=${r1.success}, errors=${r1.errors}` });

  // Second execution with SAME intent_id — should be rejected as duplicate
  const r2 = await executor.executeIntent(intent, { hack_id: 'test', bar_idx: 0 });
  const secondRejected = r2.success === false && r2.errors.some(e => e.includes('idempotent') || e.includes('duplicate') || e.includes('already exists'));
  checks.push({ check: 'duplicate_intent_rejected', pass: secondRejected,
    detail: secondRejected ? 'OK: duplicate rejected' : `FAIL: success=${r2.success}, errors=${JSON.stringify(r2.errors)}` });

  // Verify only ONE order was placed
  const onlyOneOrder = orderCount === 1;
  checks.push({ check: 'only_one_order_placed', pass: onlyOneOrder,
    detail: onlyOneOrder ? 'OK: 1 order' : `FAIL: ${orderCount} orders placed` });

  // Third execution with DIFFERENT intent_id — should succeed
  const intent2 = { intent_id: 'test_intent_002', side: 'SELL', size: 1, symbol: 'BTCUSDT', price: 105 };
  const r3 = await executor.executeIntent(intent2, { hack_id: 'test', bar_idx: 1 });
  const thirdSucceeded = r3.success === true;
  checks.push({ check: 'different_intent_succeeds', pass: thirdSucceeded,
    detail: thirdSucceeded ? 'OK: different intent_id accepted' : `FAIL: success=${r3.success}, errors=${r3.errors}` });

} catch (err) {
  checks.push({ check: 'e2e_execution', pass: false, detail: `FAIL: ${err.message}` });
}

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_IDEMPOTENCY_E2E01_VIOLATION';

writeMd(path.join(EXEC, 'DEEP_IDEMPOTENCY_E2E01.md'), [
  '# RG_IDEMPOTENCY_E2E01: Intent Idempotency E2E', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`,
  `CHECKS: ${checks.length}`, `VIOLATIONS: ${failed.length}`, '',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'deep_idempotency_e2e01.json'), {
  schema_version: '1.0.0', gate_id: 'RG_IDEMPOTENCY_E2E01', status, reason_code, run_id: RUN_ID, checks,
});

console.log(`[${status}] deep_idempotency_e2e01 — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
