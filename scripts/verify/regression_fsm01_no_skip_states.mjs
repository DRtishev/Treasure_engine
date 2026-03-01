/**
 * regression_fsm01_no_skip_states.mjs — RG_FSM01_NO_SKIP_STATES
 *
 * Structural integrity gate for EPOCH-69 FSM kernel.
 *
 * 4 structural tests:
 *   1. Forbidden leak — forbidden transitions must NOT appear in getAvailableTransitions()
 *   2. No dead ends — every non-initial state has ≥1 outgoing transition
 *   3. Valid initial — initial_state exists in states
 *   4. No orphan targets — all from/to reference defined states (or '*' wildcard)
 *
 * Write-scope: reports/evidence/EXECUTOR/gates/manual/regression_fsm01_no_skip_states.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { loadFsmKernel, getAvailableTransitions } from '../ops/state_manager.mjs';

const ROOT = process.cwd();
const EXEC = path.join(ROOT, 'reports/evidence/EXECUTOR');
const MANUAL = path.join(EXEC, 'gates/manual');
fs.mkdirSync(MANUAL, { recursive: true });

const NEXT_ACTION = 'npm run -s verify:regression:fsm01-no-skip-states';
const checks = [];

let kernel;
try {
  kernel = loadFsmKernel();
} catch (e) {
  checks.push({ check: 'kernel_load', pass: false, detail: `FSM kernel load failed: ${e.message}` });
}

if (kernel) {
  const stateNames = Object.keys(kernel.states);
  const transitionEntries = Object.entries(kernel.transitions);
  const forbidden = kernel.forbidden_transitions || [];

  // -------------------------------------------------------------------------
  // Test 1: Forbidden leak — forbidden (from, to) must NOT be reachable
  // -------------------------------------------------------------------------
  for (const f of forbidden) {
    const available = getAvailableTransitions(f.from);
    const leak = available.find((t) => t.to === f.to);
    checks.push({
      check: `forbidden_leak_${f.from}_to_${f.to}`,
      pass: !leak,
      detail: leak
        ? `FAIL: forbidden pair (${f.from} → ${f.to}) is reachable via ${leak.id}`
        : `OK: (${f.from} → ${f.to}) correctly blocked — "${f.reason}"`,
    });
  }

  // -------------------------------------------------------------------------
  // Test 2: No dead ends — every state has ≥1 outgoing transition
  //         (BOOT is initial, but it also has T01 so it should have outgoing)
  // -------------------------------------------------------------------------
  for (const state of stateNames) {
    const available = getAvailableTransitions(state);
    checks.push({
      check: `no_dead_end_${state}`,
      pass: available.length > 0,
      detail: available.length > 0
        ? `OK: ${state} has ${available.length} outgoing transition(s): ${available.map((t) => t.id).join(', ')}`
        : `FAIL: ${state} is a dead end (0 outgoing transitions)`,
    });
  }

  // -------------------------------------------------------------------------
  // Test 3: Valid initial — initial_state exists in states
  // -------------------------------------------------------------------------
  const initialValid = kernel.initial_state in kernel.states;
  checks.push({
    check: 'valid_initial_state',
    pass: initialValid,
    detail: initialValid
      ? `OK: initial_state="${kernel.initial_state}" exists in states`
      : `FAIL: initial_state="${kernel.initial_state}" not found in states`,
  });

  // -------------------------------------------------------------------------
  // Test 4: No orphan targets — all from/to reference defined states or '*'
  // -------------------------------------------------------------------------
  for (const [id, trans] of transitionEntries) {
    const fromOk = trans.from === '*' || trans.from in kernel.states;
    checks.push({
      check: `no_orphan_from_${id}`,
      pass: fromOk,
      detail: fromOk
        ? `OK: ${id}.from="${trans.from}" is valid`
        : `FAIL: ${id}.from="${trans.from}" is not a defined state`,
    });

    const toOk = trans.to in kernel.states;
    checks.push({
      check: `no_orphan_to_${id}`,
      pass: toOk,
      detail: toOk
        ? `OK: ${id}.to="${trans.to}" is valid`
        : `FAIL: ${id}.to="${trans.to}" is not a defined state`,
    });

    // Also check on_fail references
    if (trans.on_fail && trans.on_fail !== 'stay') {
      const failOk = trans.on_fail in kernel.states;
      checks.push({
        check: `no_orphan_on_fail_${id}`,
        pass: failOk,
        detail: failOk
          ? `OK: ${id}.on_fail="${trans.on_fail}" is valid`
          : `FAIL: ${id}.on_fail="${trans.on_fail}" is not a defined state`,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Additional: State count and transition count verification
  // -------------------------------------------------------------------------
  checks.push({
    check: 'state_count',
    pass: stateNames.length === 7,
    detail: `states=${stateNames.length} (expected 7): ${stateNames.join(', ')}`,
  });

  checks.push({
    check: 'transition_count',
    pass: transitionEntries.length === 7,
    detail: `transitions=${transitionEntries.length} (expected 7): ${transitionEntries.map(([id]) => id).join(', ')}`,
  });

  checks.push({
    check: 'forbidden_count',
    pass: forbidden.length === 5,
    detail: `forbidden_transitions=${forbidden.length} (expected 5)`,
  });
}

const failed = checks.filter((c) => !c.pass);
const status = failed.length === 0 ? 'PASS' : 'FAIL';
const reason_code = failed.length === 0 ? 'NONE' : 'FSM_STRUCTURAL_VIOLATION';

writeMd(path.join(EXEC, 'REGRESSION_FSM01.md'), [
  '# REGRESSION_FSM01.md — FSM Structural Integrity (No Skip States)', '',
  `STATUS: ${status}`,
  `REASON_CODE: ${reason_code}`,
  `RUN_ID: ${RUN_ID}`,
  `NEXT_ACTION: ${NEXT_ACTION}`,
  `CHECKS_TOTAL: ${checks.length}`,
  `VIOLATIONS: ${failed.length}`, '',
  '## CHECKS',
  checks.map((c) => `- [${c.pass ? 'PASS' : 'FAIL'}] ${c.check}: ${c.detail}`).join('\n'), '',
  '## FAILED',
  failed.length === 0 ? '- NONE' : failed.map((c) => `- ${c.check}: ${c.detail}`).join('\n'),
].join('\n'));

writeJsonDeterministic(path.join(MANUAL, 'regression_fsm01_no_skip_states.json'), {
  schema_version: '1.0.0',
  gate_id: 'RG_FSM01_NO_SKIP_STATES',
  status,
  reason_code,
  run_id: RUN_ID,
  next_action: NEXT_ACTION,
  checks_total: checks.length,
  violations: failed.length,
  checks,
  failed_checks: failed.map((c) => c.check),
});

console.log(`[${status}] regression_fsm01_no_skip_states — ${reason_code}`);
if (failed.length > 0) {
  for (const f of failed) console.log(`  VIOLATION: ${f.check}: ${f.detail}`);
}
process.exit(status === 'PASS' ? 0 : 1);
