/**
 * deep_kill_persist_e2e01.mjs — RG_KILL_PERSIST_E2E01
 *
 * RADICAL-LITE R1 deep gate: Kill switch persistence E2E test.
 * Uses in-memory mock repoState to test checkpoint save/restore.
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
  const { createSafetyLoop } = await import('../../core/live/safety_loop.mjs');

  const matrix = JSON.parse(fs.readFileSync(path.join(ROOT, 'specs/kill_switch_matrix.json'), 'utf8'));

  // In-memory checkpoint store (shared across loops to simulate restart)
  const checkpointStore = new Map();
  function createMockRepoState() {
    return {
      saveCheckpoint(name, payload) { checkpointStore.set(name, payload); },
      loadCheckpoint(name) { return checkpointStore.get(name) || null; },
    };
  }

  // Create safety loop 1 — trigger FLATTEN
  let flattenCalled = false;
  const loop1 = createSafetyLoop({
    matrix,
    metricsProvider: () => ({ max_drawdown: 0.15, reality_gap: 0, exchange_error_rate: 0, consecutive_losses: 0 }),
    onFlatten: () => { flattenCalled = true; },
    clock: { now: () => 1000 },
    repoState: createMockRepoState(),
  });

  loop1.evaluate();
  const state1 = loop1.getState();
  const p1 = state1.ordersPaused === true && flattenCalled;
  checks.push({ check: 'flatten_triggers_and_pauses', pass: p1,
    detail: p1 ? 'OK: FLATTEN triggered, orders paused' : `FAIL: paused=${state1.ordersPaused}, flatten=${flattenCalled}` });

  // Verify checkpoint was saved
  const saved = checkpointStore.get('safety_state');
  const p1b = saved !== undefined;
  checks.push({ check: 'checkpoint_saved', pass: p1b,
    detail: p1b ? 'OK: checkpoint saved to store' : 'FAIL: no checkpoint in store' });

  // Create safety loop 2 — simulate restart (new loop, same checkpoint store)
  const loop2 = createSafetyLoop({
    matrix,
    metricsProvider: () => ({ max_drawdown: 0, reality_gap: 0, exchange_error_rate: 0, consecutive_losses: 0 }),
    clock: { now: () => 2000 },
    repoState: createMockRepoState(),
  });

  const state2 = loop2.getState();
  const p2 = state2.ordersPaused === true;
  checks.push({ check: 'state_recovered_after_restart', pass: p2,
    detail: p2 ? 'OK: ordersPaused=true after restart' : `FAIL: ordersPaused=${state2.ordersPaused}` });

  const p3 = state2.lastAction === 'FLATTEN';
  checks.push({ check: 'lastAction_preserved', pass: p3,
    detail: p3 ? 'OK: lastAction=FLATTEN' : `FAIL: lastAction=${state2.lastAction}` });

  // Reset and verify reset state persisted
  loop2.reset();
  const loop3 = createSafetyLoop({
    matrix,
    metricsProvider: () => ({ max_drawdown: 0, reality_gap: 0, exchange_error_rate: 0, consecutive_losses: 0 }),
    clock: { now: () => 3000 },
    repoState: createMockRepoState(),
  });
  const state3 = loop3.getState();
  const p4 = state3.ordersPaused === false;
  checks.push({ check: 'reset_state_persisted', pass: p4,
    detail: p4 ? 'OK: ordersPaused=false after reset+restart' : `FAIL: ordersPaused=${state3.ordersPaused}` });

} catch (err) {
  checks.push({ check: 'e2e_execution', pass: false, detail: `FAIL: ${err.message}` });
}

const failed = checks.filter(c => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'RG_KILL_PERSIST_E2E01_VIOLATION';

writeMd(path.join(EXEC, 'DEEP_KILL_PERSIST_E2E01.md'), [
  '# RG_KILL_PERSIST_E2E01: Kill Switch Persistence E2E', '',
  `STATUS: ${status}`, `REASON_CODE: ${reason_code}`, `RUN_ID: ${RUN_ID}`,
  `CHECKS: ${checks.length}`, `VIOLATIONS: ${failed.length}`, '',
  checks.map(c => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'deep_kill_persist_e2e01.json'), {
  schema_version: '1.0.0', gate_id: 'RG_KILL_PERSIST_E2E01', status, reason_code, run_id: RUN_ID, checks,
});

console.log(`[${status}] deep_kill_persist_e2e01 — ${reason_code}`);
process.exit(status === 'PASS' ? 0 : 1);
