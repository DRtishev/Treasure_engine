/**
 * regression_fsm01_no_skip_states.mjs — RG_FSM01_NO_SKIP_STATES
 *
 * Structural integrity gate for EPOCH-69 FSM kernel.
 *
 * 9 structural test categories:
 *   1. Forbidden leak — forbidden transitions must NOT appear in getAvailableTransitions()
 *   2. No dead ends — every non-initial state has ≥1 outgoing transition
 *   3. Valid initial — initial_state exists in states
 *   4. No orphan targets — all from/to reference defined states (or '*' wildcard)
 *   5. Goal reachability — BOOT can reach every goal_state via BFS (EPOCH-69 G1)
 *   6. Breaker config — circuit_breaker.applies_to references valid transitions
 *   7. Max cycles sanity — 0 < max_cycles < max_goal_attempts
 *   8. Goal mode existence — every goal_state has a mode defined
 *   9. Timeout sanity — all transition timeout_ms >= 0
 *
 * Write-scope: reports/evidence/EXECUTOR/gates/manual/regression_fsm01_no_skip_states.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { loadFsmKernel, getAvailableTransitions, findPathToGoal } from '../ops/state_manager.mjs';

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

  // -------------------------------------------------------------------------
  // Test 5: Goal reachability — BOOT can reach every goal_state via BFS (G1)
  // Proves the organism CAN reach its goals from initial state.
  // -------------------------------------------------------------------------
  const goalStates = kernel.goal_states ?? [];
  checks.push({
    check: 'goal_states_defined',
    pass: goalStates.length >= 2,
    detail: `goal_states count=${goalStates.length} (expected ≥2): ${goalStates.join(', ') || 'NONE'}`,
  });

  for (const goal of goalStates) {
    const goalInStates = goal in kernel.states;
    checks.push({
      check: `goal_in_states_${goal}`,
      pass: goalInStates,
      detail: goalInStates
        ? `OK: goal "${goal}" exists in states`
        : `FAIL: goal "${goal}" not defined in states`,
    });

    if (goalInStates) {
      const pathFromBoot = findPathToGoal(kernel.initial_state, goal);
      const reachable = pathFromBoot.length > 0;
      checks.push({
        check: `goal_reachable_from_BOOT_to_${goal}`,
        pass: reachable,
        detail: reachable
          ? `OK: ${kernel.initial_state} → ${goal} via ${pathFromBoot.map((t) => t.id).join(' → ')}`
          : `FAIL: no path from ${kernel.initial_state} to ${goal}`,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Test 6: Circuit breaker config — applies_to must reference real transitions
  // -------------------------------------------------------------------------
  const cbConfig = kernel.circuit_breaker;
  if (cbConfig) {
    const transitionIds = Object.keys(kernel.transitions);
    for (const cbTid of cbConfig.applies_to ?? []) {
      const cbValid = transitionIds.includes(cbTid);
      checks.push({
        check: `breaker_valid_tid_${cbTid}`,
        pass: cbValid,
        detail: cbValid
          ? `OK: circuit_breaker applies_to "${cbTid}" is a valid transition`
          : `FAIL: circuit_breaker applies_to "${cbTid}" not found in transitions`,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Test 7: max_cycles sanity — 0 < max_cycles < max_goal_attempts
  // -------------------------------------------------------------------------
  const maxCycles = kernel.max_cycles ?? 0;
  const maxGoalAttempts = kernel.max_goal_attempts ?? 0;
  const cyclesSane = maxCycles > 0 && maxGoalAttempts > 0 && maxCycles < maxGoalAttempts;
  checks.push({
    check: 'max_cycles_sanity',
    pass: cyclesSane,
    detail: cyclesSane
      ? `OK: max_cycles=${maxCycles} < max_goal_attempts=${maxGoalAttempts}`
      : `FAIL: max_cycles=${maxCycles}, max_goal_attempts=${maxGoalAttempts} (need 0 < max_cycles < max_goal_attempts)`,
  });

  // -------------------------------------------------------------------------
  // Test 8: Goal state mode existence — every goal_state has a mode defined
  // -------------------------------------------------------------------------
  for (const goal of goalStates) {
    if (goal in kernel.states) {
      const goalMode = kernel.states[goal]?.mode;
      const hasMode = typeof goalMode === 'string' && goalMode.length > 0;
      checks.push({
        check: `goal_mode_defined_${goal}`,
        pass: hasMode,
        detail: hasMode
          ? `OK: goal "${goal}" has mode="${goalMode}"`
          : `FAIL: goal "${goal}" has no mode defined`,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Test 9: Timeout sanity — all transition timeout_ms >= 0
  // -------------------------------------------------------------------------
  for (const [id, trans] of transitionEntries) {
    if (trans.timeout_ms !== undefined) {
      const timeoutOk = typeof trans.timeout_ms === 'number' && trans.timeout_ms >= 0;
      checks.push({
        check: `timeout_sane_${id}`,
        pass: timeoutOk,
        detail: timeoutOk
          ? `OK: ${id}.timeout_ms=${trans.timeout_ms}`
          : `FAIL: ${id}.timeout_ms=${trans.timeout_ms} (must be number >= 0)`,
      });
    }
  }
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
