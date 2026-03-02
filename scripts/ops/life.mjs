/**
 * life.mjs v2 — ops:life — THE AWAKENED ORGANISM
 *
 * EPOCH-70 AWAKENING: FSM drives the organism.
 *
 * BC: verify_fast hard_stop is now enforced by FSM (runToGoal ABORT on failure).
 *
 * 5 Phases:
 *   Phase 1: PROPRIOCEPTION  — scan self (state, environment, trajectory)
 *   Phase 2: CONSCIOUSNESS   — runToGoal('CERTIFIED') — FSM executes transitions
 *   Phase 3: TELEMETRY       — organ pipeline (eventbus, timemachine, autopilot,
 *                               cockpit, candidates)
 *   Phase 4: REFLEX SCAN     — auto-degrade on critical telemetry failures
 *   Phase 5: SEAL            — evidence + watermark + exit
 *
 * EPOCH-69 ABSORPTION:
 *   S01 (verify:fast) is now INSIDE FSM (T02 action).
 *   Steps S02-S06 are TELEMETRY (post-FSM).
 *
 * Network: FORBIDDEN (TREASURE_NET_KILL=1)
 * Write-scope: reports/evidence/EPOCH-LIFE-<RUN_ID>/
 *
 * GENIUS FEATURES:
 *   G8: PROPRIOCEPTION — self-awareness context (§2)
 *   G9: REFLEXES — automatic interrupt-driven degradation (§3)
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { createBus } from './eventbus_v1.mjs';
import {
  loadFsmKernel, runToGoal, replayState, stateToMode,
  executeTransition, writeWatermark, getCircuitBreakerState,
} from './state_manager.mjs';
import { scan as proprioScan } from './proprioception.mjs';

const ROOT = process.cwd();

// FIX-01: self-harden net-kill for ALL child runs
process.env.TREASURE_NET_KILL = '1';
const preloadAbs = path.join(ROOT, 'scripts', 'safety', 'net_kill_preload.cjs');
const reqFlag = `--require ${preloadAbs}`;
if (!(process.env.NODE_OPTIONS || '').includes(reqFlag)) {
  process.env.NODE_OPTIONS = ((process.env.NODE_OPTIONS || '') + ' ' + reqFlag).trim();
}

const EPOCH_DIR = path.join(ROOT, 'reports', 'evidence', `EPOCH-LIFE-${RUN_ID}`);
fs.mkdirSync(EPOCH_DIR, { recursive: true });

// Life EventBus — uses EPOCH-EVENTBUS-LIFE-* so findAllBusJsonls aggregates it
const busDir = path.join(ROOT, 'reports', 'evidence', `EPOCH-EVENTBUS-LIFE-${RUN_ID}`);
const bus = createBus(RUN_ID, busDir);

// ---------------------------------------------------------------------------
// REFLEX REGISTRY (G9) — hardwired automatic responses
// ---------------------------------------------------------------------------
const REFLEX_REGISTRY = [
  {
    name: 'degradation_reflex',
    trigger: 'STEP_FAIL',
    guard: (state, _ev) => !['BOOT', 'DEGRADED', 'HEALING'].includes(state),
    response: 'T05_ANY_TO_DEGRADED',
    cooldown: 0,
  },
  {
    name: 'halt_on_blocked_goal',
    trigger: 'GOAL_BLOCKED',
    guard: (_state, _ev) => true,
    response: 'LOG_ONLY',
    cooldown: 0,
  },
];

// ---------------------------------------------------------------------------
// Reflex scanner — checks and fires reflexes after each telemetry step
// ---------------------------------------------------------------------------
function checkReflexes(currentState, triggerEvent) {
  for (const reflex of REFLEX_REGISTRY) {
    if (triggerEvent.event !== reflex.trigger) continue;
    if (!reflex.guard(currentState, triggerEvent)) continue;

    // LOG_ONLY: record but don't execute a transition
    if (reflex.response === 'LOG_ONLY') {
      bus.append({
        mode: stateToMode(currentState),
        component: 'LIFE',
        event: 'REFLEX_FIRED',
        reason_code: 'LIFE_REFLEX_FIRED',
        surface: 'CONTRACT',
        attrs: {
          reflex_name: reflex.name,
          trigger: triggerEvent.event,
          from_state: currentState,
          to_state: currentState,
          transition: 'LOG_ONLY',
        },
      });
      return { fired: true, newState: currentState, reflex: reflex.name };
    }

    // FIRE REFLEX — execute the transition
    const result = executeTransition(bus, currentState, reflex.response, {
      reflex_name: reflex.name,
      trigger_event: triggerEvent.event,
      failed_gate: true,
      recentEvents: bus.events().slice(-10),
    });

    bus.append({
      mode: stateToMode(result.newState),
      component: 'LIFE',
      event: 'REFLEX_FIRED',
      reason_code: result.success ? 'LIFE_REFLEX_FIRED' : 'FSM_ACTION_FAIL',
      surface: 'CONTRACT',
      attrs: {
        reflex_name: reflex.name,
        trigger: triggerEvent.event,
        from_state: currentState,
        to_state: result.newState,
        transition: reflex.response,
      },
    });

    return { fired: true, newState: result.newState, reflex: reflex.name };
  }
  return { fired: false, newState: currentState };
}

// ---------------------------------------------------------------------------
// Telemetry step definitions (formerly S02-S06, now T1-T5)
// ---------------------------------------------------------------------------
const TELEMETRY_STEPS = [
  {
    id: 'T1',
    name: 'ops_eventbus_smoke',
    label: 'ops:eventbus:smoke',
    shell: false,
    cmd: process.execPath,
    args: ['scripts/ops/eventbus_v1.mjs'],
  },
  {
    id: 'T2',
    name: 'ops_timemachine',
    label: 'ops:timemachine',
    shell: false,
    cmd: process.execPath,
    args: ['scripts/ops/timemachine_ledger.mjs'],
  },
  {
    id: 'T3',
    name: 'ops_autopilot',
    label: 'ops:autopilot',
    shell: false,
    cmd: process.execPath,
    args: ['scripts/ops/autopilot_court_v2.mjs'],
  },
  {
    id: 'T4',
    name: 'ops_cockpit',
    label: 'ops:cockpit',
    shell: false,
    cmd: process.execPath,
    args: ['scripts/ops/cockpit.mjs'],
  },
  {
    id: 'T5',
    name: 'ops_candidates',
    label: 'ops:candidates',
    shell: false,
    cmd: process.execPath,
    args: ['scripts/ops/candidate_registry.mjs'],
  },
];

// ---------------------------------------------------------------------------
// Run a single telemetry step
// ---------------------------------------------------------------------------
function runStep(step) {
  let result;

  if (step.shell) {
    result = spawnSync(step.cmd, { cwd: ROOT, encoding: 'utf8', env: { ...process.env }, shell: true });
  } else {
    result = spawnSync(step.cmd, step.args ?? [], { cwd: ROOT, encoding: 'utf8', env: { ...process.env } });
  }

  const exitCode = result.status ?? 127;
  const stepStatus = exitCode === 0 ? 'PASS' : (exitCode === 2 ? 'BLOCKED' : 'FAIL');
  const stdout = (result.stdout ?? '').trim().slice(0, 300);
  const stderr = (result.stderr ?? '').trim().slice(0, 200);

  return {
    step_id: step.id, name: step.name, label: step.label,
    exit_code: exitCode, status: stepStatus, stdout, stderr,
    netkill_enforced: true,
    node_options_contains_preload: (process.env.NODE_OPTIONS || '').includes('net_kill_preload.cjs'),
    preload_path_rel: 'scripts/safety/net_kill_preload.cjs',
  };
}

// =========================================================================
// PHASE 1: PROPRIOCEPTION
// =========================================================================
console.log(`[ops:life] BOOT — RUN_ID=${RUN_ID}`);
console.log('[ops:life] EPOCH-70: THE ORGANISM AWAKENS');
console.log('');

let proprio;
try {
  proprio = proprioScan(null);
} catch (e) {
  // Fallback context on proprioception failure
  proprio = Object.freeze({
    fsm_state: 'BOOT',
    fsm_mode: 'LIFE',
    fsm_source: 'initial',
    previous_state: null,
    previous_outcome: null,
    state_continuity: false,
    run_number: 0,
    watermark_tick: 0,
    env: {},
    available_transitions: [],
    goal_path: [],
    circuit_breakers: {},
    blocked_transitions: [],
  });
  console.log(`[ops:life] PROPRIO: scan failed — ${e.message}`);
}

bus.append({
  mode: proprio.fsm_mode,
  component: 'LIFE',
  event: 'LIFE_BOOT',
  reason_code: 'NONE',
  surface: 'UX',
  attrs: {
    steps_total: String(TELEMETRY_STEPS.length),
    run_id: RUN_ID,
    fsm_state: proprio.fsm_state,
    fsm_mode: proprio.fsm_mode,
  },
});

bus.append({
  mode: proprio.fsm_mode,
  component: 'LIFE',
  event: 'PROPRIO_SCAN',
  reason_code: proprio.fsm_source === 'initial' && proprio.env && Object.keys(proprio.env).length === 0
    ? 'LIFE_PROPRIO_FAIL'
    : 'NONE',
  surface: 'CONTRACT',
  attrs: {
    fsm_state: proprio.fsm_state,
    fsm_mode: proprio.fsm_mode,
    fsm_source: proprio.fsm_source,
    previous_state: proprio.previous_state ?? 'null',
    previous_outcome: proprio.previous_outcome ?? 'null',
    state_continuity: String(proprio.state_continuity),
    run_number: String(proprio.run_number),
    env_deps_ready: String(proprio.env.deps_ready ?? false),
    env_git_present: String(proprio.env.git_present ?? false),
    env_executor_present: String(proprio.env.executor_present ?? false),
    env_gate_count: String(proprio.env.gate_count ?? 0),
  },
});

console.log(`[ops:life] PROPRIO: state=${proprio.fsm_state} mode=${proprio.fsm_mode} source=${proprio.fsm_source}`);
console.log('');

// =========================================================================
// PHASE 2: CONSCIOUSNESS (Goal-Seeking)
// =========================================================================
let kernel;
try {
  kernel = loadFsmKernel();
} catch {
  kernel = { goal_states: ['CERTIFIED'], initial_state: 'BOOT', states: {} };
}

const goalState = process.env.GOAL_STATE && kernel.states[process.env.GOAL_STATE]
  ? process.env.GOAL_STATE
  : (kernel.goal_states?.[0] ?? 'CERTIFIED');

let currentState = proprio.fsm_state;
let consciousnessResult;
const reflexesFired = [];

// Check if already at goal
if (currentState === goalState) {
  // GOAL_ALREADY_REACHED: validate environment to trust watermark
  const envValid = proprio.env.executor_present && proprio.env.gate_count > 0;
  if (envValid) {
    consciousnessResult = {
      goal: goalState,
      reached: true,
      final_state: currentState,
      total_failures: 0,
      cycle_count: 0,
      transitions_executed: 0,
      reason: null,
    };

    bus.append({
      mode: stateToMode(currentState),
      component: 'LIFE',
      event: 'GOAL_ALREADY_REACHED',
      reason_code: 'LIFE_GOAL_ALREADY_REACHED',
      surface: 'CONTRACT',
      attrs: {
        goal: goalState,
        final_state: currentState,
        validation: 'executor_present+gate_count',
      },
    });

    console.log(`[ops:life] CONSCIOUSNESS: already at ${goalState} — skipping runToGoal`);
  } else {
    // Environment doesn't validate — re-run from BOOT
    currentState = kernel.initial_state;
    writeWatermark(currentState, bus.events().length, RUN_ID);
    consciousnessResult = null; // will be set below
  }
}

if (!consciousnessResult) {
  console.log(`[ops:life] CONSCIOUSNESS: runToGoal('${goalState}') from ${currentState}`);

  const goalResult = runToGoal(bus, goalState);

  consciousnessResult = {
    goal: goalState,
    reached: goalResult.reached,
    final_state: goalResult.finalState,
    total_failures: goalResult.totalFailures,
    cycle_count: goalResult.cycleCount,
    transitions_executed: goalResult.history?.length ?? 0,
    reason: goalResult.reason ?? null,
  };

  currentState = goalResult.finalState;
  console.log(`[ops:life] CONSCIOUSNESS: reached=${goalResult.reached} final_state=${goalResult.finalState} failures=${goalResult.totalFailures}`);
}

bus.append({
  mode: stateToMode(currentState),
  component: 'LIFE',
  event: 'CONSCIOUSNESS_RESULT',
  reason_code: 'LIFE_CONSCIOUSNESS_RESULT',
  surface: 'CONTRACT',
  attrs: {
    goal: consciousnessResult.goal,
    reached: String(consciousnessResult.reached),
    final_state: consciousnessResult.final_state,
    total_failures: String(consciousnessResult.total_failures),
    cycle_count: String(consciousnessResult.cycle_count),
    transitions_executed: String(consciousnessResult.transitions_executed),
    reason: consciousnessResult.reason ?? 'null',
  },
});

console.log('');

// =========================================================================
// PHASE 3: TELEMETRY (Organ Pipeline) + PHASE 4: REFLEX SCAN (inline)
// =========================================================================
console.log(`[ops:life] TELEMETRY: ${TELEMETRY_STEPS.map((s) => s.label).join(' → ')}`);
console.log('');

const stepResults = [];

for (const step of TELEMETRY_STEPS) {
  process.stdout.write(`  [${step.id}] ${step.label} ... `);
  const result = runStep(step);
  stepResults.push(result);

  const stepMode = stateToMode(currentState);

  bus.append({
    mode: stepMode,
    component: 'LIFE',
    event: 'STEP_COMPLETE',
    reason_code: result.status === 'PASS' ? 'NONE' : `LIFE_STEP_${result.status}`,
    surface: 'UX',
    attrs: {
      step_id: result.step_id,
      step_name: result.name,
      step_status: result.status,
      exit_code: String(result.exit_code),
    },
  });

  console.log(result.status);
  if (result.stdout) console.log(`         ${result.stdout.split('\n').join('\n         ')}`);

  // Phase 4: REFLEX SCAN — fire reflexes on failure
  if (result.status !== 'PASS') {
    const failEvent = {
      event: 'STEP_FAIL',
      component: 'LIFE',
      attrs: { step_id: result.step_id, step_name: result.name, exit_code: result.exit_code },
    };

    bus.append({
      mode: stepMode,
      component: 'LIFE',
      event: 'STEP_FAIL',
      reason_code: `LIFE_STEP_${result.status}`,
      surface: 'CONTRACT',
      attrs: {
        step_id: result.step_id,
        step_name: result.name,
        exit_code: String(result.exit_code),
      },
    });

    const reflexResult = checkReflexes(currentState, failEvent);
    if (reflexResult.fired) {
      currentState = reflexResult.newState;
      reflexesFired.push({
        reflex: reflexResult.reflex,
        trigger_step: result.step_id,
        from_state: currentState,
        to_state: reflexResult.newState,
      });
      console.log(`         REFLEX: ${reflexResult.reflex} → ${reflexResult.newState}`);
    }
  }
}

console.log('');

// =========================================================================
// PHASE 5: SEAL
// =========================================================================

// Compute life outcome
let lifeOutcome;
if (consciousnessResult.reached && reflexesFired.length === 0 &&
    stepResults.every((s) => s.status === 'PASS')) {
  lifeOutcome = 'ALIVE';
} else if (consciousnessResult.reached && stepResults.some((s) => s.status !== 'PASS')) {
  lifeOutcome = 'IMPAIRED';
} else if (reflexesFired.some((r) => r.reflex === 'degradation_reflex')) {
  lifeOutcome = 'DEGRADED';
} else if (Object.values(getCircuitBreakerState()).some((cb) => cb.open)) {
  lifeOutcome = 'CRITICAL';
} else if (!consciousnessResult.reached) {
  lifeOutcome = 'BLOCKED';
} else {
  lifeOutcome = 'IMPAIRED';
}

// Backward-compatible status
const failed = stepResults.filter((s) => s.status !== 'PASS' && s.status !== 'BLOCKED');
const blocked = stepResults.filter((s) => s.status === 'BLOCKED');
const lifeStatus = !consciousnessResult.reached ? 'ABORT' : (failed.length > 0 ? 'FAIL' : 'PASS');
const lifeReason = !consciousnessResult.reached ? 'LIFE_HARD_STOP' : (failed.length > 0 ? 'LIFE_STEP_FAIL' : 'NONE');

// Life outcome reason code
const outcomeReasonMap = {
  ALIVE: 'LIFE_OUTCOME_ALIVE',
  IMPAIRED: 'LIFE_OUTCOME_IMPAIRED',
  DEGRADED: 'LIFE_OUTCOME_DEGRADED',
  CRITICAL: 'LIFE_OUTCOME_CRITICAL',
  BLOCKED: 'LIFE_OUTCOME_BLOCKED',
};

bus.append({
  mode: stateToMode(currentState),
  component: 'LIFE',
  event: 'LIFE_OUTCOME',
  reason_code: outcomeReasonMap[lifeOutcome] ?? 'NONE',
  surface: 'UX',
  attrs: {
    life_outcome: lifeOutcome,
    fsm_final_state: currentState,
    consciousness_reached: String(consciousnessResult.reached),
    reflexes_fired_count: String(reflexesFired.length),
    telemetry_passed: String(stepResults.filter((s) => s.status === 'PASS').length),
    telemetry_failed: String(failed.length),
  },
});

bus.append({
  mode: stateToMode(currentState),
  component: 'LIFE',
  event: 'LIFE_SEAL',
  reason_code: lifeReason,
  surface: 'UX',
  attrs: {
    steps_run: String(stepResults.length),
    steps_passed: String(stepResults.filter((s) => s.status === 'PASS').length),
    steps_failed: String(failed.length),
    steps_blocked: String(blocked.length),
    life_status: lifeStatus,
    life_outcome: lifeOutcome,
    fsm_final_state: currentState,
  },
});

const { jsonlPath: busJsonlPath } = bus.flush();

// Determine one_next_action from consciousness result
// BC: Surface actionable next_action from gate receipt (RG_LIFE04)
// When consciousness fails (equivalent to old S01 hard_stop / verify_fast),
// check if step.id === 'S01' equivalent failed with result.status === 'BLOCKED'
let oneNextAction = null;
if (!consciousnessResult.reached) {
  // Try to read toolchain next_action from receipt (same as old S01 BLOCKED path)
  try {
    const ensureJson = path.join(ROOT, 'reports/evidence/EXECUTOR/gates/manual/node_toolchain_ensure.json');
    if (fs.existsSync(ensureJson)) {
      const receipt = JSON.parse(fs.readFileSync(ensureJson, 'utf8'));
      if (receipt.detail && typeof receipt.detail === 'object' && receipt.detail.next_action) {
        oneNextAction = receipt.detail.next_action;
      }
    }
  } catch { /* fail-soft: oneNextAction stays null */ }
  if (!oneNextAction) oneNextAction = 'npm run -s ops:node:toolchain:bootstrap';
}

// ---------------------------------------------------------------------------
// Write LIFE_SUMMARY.json v2
// ---------------------------------------------------------------------------
writeJsonDeterministic(path.join(EPOCH_DIR, 'LIFE_SUMMARY.json'), {
  schema_version: '2.0.0',
  gate_id: 'WOW_ORGANISM_LIFE',
  run_id: RUN_ID,
  status: lifeStatus,
  life_outcome: lifeOutcome,
  reason_code: lifeReason,

  // EPOCH-70: CONSCIOUSNESS
  proprio: {
    fsm_state: proprio.fsm_state,
    fsm_mode: proprio.fsm_mode,
    fsm_source: proprio.fsm_source,
    previous_state: proprio.previous_state,
    previous_outcome: proprio.previous_outcome,
    run_number: proprio.run_number,
    env: proprio.env,
  },
  consciousness_result: consciousnessResult,
  fsm_final_state: currentState,
  reflexes_fired: reflexesFired,

  // COMPAT: EPOCH-69 fields preserved
  steps_total: TELEMETRY_STEPS.length,
  steps_run: stepResults.length,
  steps_passed: stepResults.filter((s) => s.status === 'PASS').length,
  steps_failed: failed.length,
  steps_blocked: blocked.length,
  aborted: !consciousnessResult.reached,
  abort_reason: !consciousnessResult.reached
    ? `consciousness blocked: ${consciousnessResult.reason ?? 'unknown'}`
    : null,
  step_results: stepResults.map((s) => ({
    step_id: s.step_id, name: s.name, status: s.status, exit_code: s.exit_code,
    netkill_enforced: s.netkill_enforced,
    node_options_contains_preload: s.node_options_contains_preload,
    preload_path_rel: s.preload_path_rel,
  })),
  next_action: oneNextAction ?? 'npm run -s verify:fast',
  one_next_action: oneNextAction ?? null,
});

// ---------------------------------------------------------------------------
// Write LIFE_SUMMARY.md v2
// ---------------------------------------------------------------------------
const stepRows = stepResults.map((s) =>
  `| ${s.step_id} | ${s.label} | ${s.status} | ${s.exit_code} |`
).join('\n');

writeMd(path.join(EPOCH_DIR, 'LIFE_SUMMARY.md'), [
  `# LIFE SUMMARY — EPOCH-LIFE-${RUN_ID}`, '',
  `STATUS: ${lifeStatus}`,
  `LIFE_OUTCOME: ${lifeOutcome}`,
  `REASON_CODE: ${lifeReason}`,
  `RUN_ID: ${RUN_ID}`,
  '',
  '## PROPRIOCEPTION',
  `FSM_STATE: ${proprio.fsm_state}`,
  `FSM_MODE: ${proprio.fsm_mode}`,
  `FSM_SOURCE: ${proprio.fsm_source}`,
  `PREVIOUS_STATE: ${proprio.previous_state ?? 'null'}`,
  `RUN_NUMBER: ${proprio.run_number}`,
  '',
  '## CONSCIOUSNESS',
  `GOAL: ${consciousnessResult.goal}`,
  `REACHED: ${consciousnessResult.reached}`,
  `FINAL_STATE: ${consciousnessResult.final_state}`,
  `TOTAL_FAILURES: ${consciousnessResult.total_failures}`,
  `CYCLE_COUNT: ${consciousnessResult.cycle_count}`,
  `TRANSITIONS_EXECUTED: ${consciousnessResult.transitions_executed}`,
  consciousnessResult.reason ? `REASON: ${consciousnessResult.reason}` : '',
  '',
  '## TELEMETRY',
  '',
  '| Step | Command | Status | Exit Code |',
  '|------|---------|--------|-----------|',
  stepRows,
  '',
  '## REFLEXES',
  reflexesFired.length === 0
    ? '- NONE'
    : reflexesFired.map((r) => `- ${r.reflex}: ${r.trigger_step} → ${r.to_state}`).join('\n'),
  '',
  '## NEXT_ACTION',
  oneNextAction ?? 'npm run -s verify:fast',
  '',
].filter((l) => l !== null).join('\n'));

// ---------------------------------------------------------------------------
// Final watermark write
// ---------------------------------------------------------------------------
writeWatermark(currentState, bus.events().length, RUN_ID);

// ---------------------------------------------------------------------------
// Console summary
// ---------------------------------------------------------------------------
console.log(`[${lifeStatus}] ops:life — ${lifeOutcome} — ${lifeReason}`);
console.log(`  EPOCH:   ${path.relative(ROOT, EPOCH_DIR)}`);
console.log(`  EVENTS:  ${path.relative(ROOT, busJsonlPath)}`);
console.log(`  FSM:     ${currentState} (${stateToMode(currentState)})`);
console.log(`  CONSCIOUSNESS: goal=${consciousnessResult.goal} reached=${consciousnessResult.reached}`);
console.log(`  TELEMETRY: ${stepResults.length}/${TELEMETRY_STEPS.length} run, ${stepResults.filter((s) => s.status === 'PASS').length} PASS, ${failed.length} FAIL`);
if (reflexesFired.length > 0) console.log(`  REFLEXES: ${reflexesFired.length} fired`);
if (oneNextAction) console.log(`  ONE_NEXT_ACTION: ${oneNextAction}`);

// Exit code based on FSM final state
const goalStates = kernel.goal_states ?? ['CERTIFIED', 'EDGE_READY'];
if (goalStates.includes(currentState)) {
  process.exit(0);
} else if (currentState === 'DEGRADED' || currentState === 'HEALING') {
  process.exit(1);
} else {
  process.exit(lifeStatus === 'PASS' ? 0 : (lifeStatus === 'ABORT' ? 2 : 1));
}
