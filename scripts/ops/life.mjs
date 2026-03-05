/**
 * life.mjs v4 — ops:life — THE METAAGENT ORGANISM
 *
 * EPOCH-72 THE METAAGENT: organism gains swarm-level intelligence.
 * Each candidate has its own CandidateFSM lifecycle.
 * MetaAgent manages the fleet: quarantine, graduation, rebalancing.
 *
 * BC: verify_fast hard_stop is now enforced by FSM (runToGoal ABORT on failure).
 *
 * 6+1 Phases:
 *   Phase 1:   PROPRIOCEPTION  — scan self (state, environment, trajectory)
 *   Phase 2:   CONSCIOUSNESS   — runToGoal('CERTIFIED') — FSM executes transitions
 *   Phase 3:   TELEMETRY       — organ pipeline (eventbus, timemachine, autopilot,
 *                                 cockpit, candidates, doctor)
 *   Phase 3.5: DOCTOR VERDICT  — ingest doctor receipt, emit DOCTOR_VERDICT_FAIL
 *   Phase 4:   REFLEX SCAN     — auto-degrade on critical telemetry/doctor failures
 *   Phase 4.5: IMMUNE RESPONSE — healing loop when DEGRADED
 *   Phase 4.7: METAAGENT TICK  — fleet consciousness: scan + decisions
 *   Phase 5:   SEAL            — evidence + watermark + exit
 *
 * EPOCH-69 ABSORPTION:
 *   S01 (verify:fast) is now INSIDE FSM (T02 action).
 *   Steps S02-S06 are TELEMETRY (post-FSM).
 *
 * EPOCH-71 ADDITIONS:
 *   T6: ops:doctor — immune telemetry step
 *   immune_reflex: DOCTOR_VERDICT_FAIL → T05 degradation
 *   Phase 4.5: T06 → healAll() → T07 → BOOT
 *
 * EPOCH-72 ADDITIONS:
 *   G12: MetaAgent fleet consciousness (scan, tick, auto-quarantine)
 *   G13: GraduationCourt (5 formal exams per candidate)
 *   Phase 4.7: MetaAgent.tick() — fleet-level decisions emitted to bus
 *   LIFE_SUMMARY v4 with fleet section
 *
 * Network: FORBIDDEN (TREASURE_NET_KILL=1)
 * Write-scope: reports/evidence/EPOCH-LIFE-<RUN_ID>/
 *
 * GENIUS FEATURES:
 *   G8:  PROPRIOCEPTION — self-awareness context
 *   G9:  REFLEXES — automatic interrupt-driven degradation
 *   G10: IMMUNE REFLEXES — doctor-driven degradation
 *   G11: HEALING LOOP — FSM-driven DEGRADED → HEALING → BOOT
 *   G12: METAAGENT — fleet consciousness (scan, tick, quarantine, graduation)
 *   G13: GRADUATION COURT — 5 formal exams for candidate promotion
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RUN_ID, writeMd } from '../edge/edge_lab/canon.mjs';
import { writeJsonDeterministic } from '../lib/write_json_deterministic.mjs';
import { createBus } from './eventbus_v1.mjs';
import {
  loadFsmKernel, runToGoal, stateToMode,
  executeTransition, writeWatermark, getCircuitBreakerState,
} from './state_manager.mjs';
import { scan as proprioScan } from './proprioception.mjs';
import { MetaAgent } from './metaagent.mjs';

const ROOT = process.cwd();

// FIX-02: prevent recursive nesting (doctor → life → doctor → life → ...)
const NESTING_DEPTH = parseInt(process.env.TREASURE_LIFE_DEPTH || '0', 10);
process.env.TREASURE_LIFE_DEPTH = String(NESTING_DEPTH + 1);

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
    name: 'immune_reflex',
    trigger: 'DOCTOR_VERDICT_FAIL',
    guard: (state, ev) => {
      if (['BOOT', 'DEGRADED', 'HEALING'].includes(state)) return false;
      const score = parseInt(ev.attrs?.score ?? '100', 10);
      return score < 70;
    },
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
const _ALL_TELEMETRY_STEPS = [
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
  {
    id: 'T6',
    name: 'ops_doctor',
    label: 'ops:doctor',
    shell: false,
    cmd: process.execPath,
    args: ['scripts/ops/doctor_v2.mjs'],
  },
];
// FIX-02: skip T6 (nested doctor) when running inside doctor/life chain to prevent
// infinite recursion: doctor → life → T6:doctor → life → T6:doctor → ...timeout
const TELEMETRY_STEPS = NESTING_DEPTH >= 1
  ? _ALL_TELEMETRY_STEPS.filter((s) => s.id !== 'T6')
  : _ALL_TELEMETRY_STEPS;

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
console.log('[ops:life] THE IMMUNE ORGANISM');
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
  // GOAL_ALREADY_REACHED: validate environment + freshness to trust watermark
  // BUG-C FIX: require watermark_tick > 0 to prevent trusting stale state
  const envValid = proprio.env.executor_present && proprio.env.gate_count > 0
    && proprio.watermark_tick > 0;
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
      const prevState = currentState;
      currentState = reflexResult.newState;
      reflexesFired.push({
        reflex: reflexResult.reflex,
        trigger_step: result.step_id,
        from_state: prevState,
        to_state: reflexResult.newState,
      });
      console.log(`         REFLEX: ${reflexResult.reflex} → ${reflexResult.newState}`);
    }
  }
}

console.log('');

// =========================================================================
// PHASE 3.5: DOCTOR VERDICT INGESTION (after T6)
// =========================================================================
let latestDoctorVerdict = null;
let doctorScore = 100;
{
  const evidDir = path.join(ROOT, 'reports', 'evidence');
  try {
    const doctorDirs = fs.readdirSync(evidDir)
      .filter((d) => d.startsWith('EPOCH-DOCTOR-')).sort();
    if (doctorDirs.length > 0) {
      const latest = doctorDirs[doctorDirs.length - 1];
      // BUG-H FIX: robust multi-filename scan for doctor receipt
      for (const fname of ['DOCTOR.json', 'receipt.json']) {
        const rp = path.join(evidDir, latest, fname);
        if (fs.existsSync(rp)) {
          const receipt = JSON.parse(fs.readFileSync(rp, 'utf8'));
          if (receipt.status || receipt.verdict) {
            latestDoctorVerdict = receipt.status ?? receipt.verdict ?? null;
            doctorScore = receipt.score ?? receipt.total_score ?? 100;
            break;
          }
        }
      }
      // Fallback: first .json in dir with status/verdict field
      if (!latestDoctorVerdict) {
        const files = fs.readdirSync(path.join(evidDir, latest)).filter(f => f.endsWith('.json'));
        for (const f of files) {
          try {
            const receipt = JSON.parse(fs.readFileSync(path.join(evidDir, latest, f), 'utf8'));
            if (receipt.status || receipt.verdict) {
              latestDoctorVerdict = receipt.status ?? receipt.verdict ?? null;
              doctorScore = receipt.score ?? receipt.total_score ?? 100;
              break;
            }
          } catch { /* skip malformed */ }
        }
      }

      if (latestDoctorVerdict && latestDoctorVerdict !== 'HEALTHY') {
        const doctorFailEvent = {
          event: 'DOCTOR_VERDICT_FAIL',
          component: 'LIFE',
          attrs: {
            verdict: latestDoctorVerdict,
            score: String(doctorScore),
          },
        };

        bus.append({
          mode: stateToMode(currentState),
          component: 'LIFE',
          event: 'DOCTOR_VERDICT_FAIL',
          reason_code: 'LIFE_IMMUNE_RESPONSE',
          surface: 'CONTRACT',
          attrs: {
            verdict: latestDoctorVerdict,
            score: String(doctorScore),
          },
        });

        // Check immune reflex
        const reflexResult = checkReflexes(currentState, doctorFailEvent);
        if (reflexResult.fired) {
          const prevState = currentState;
          currentState = reflexResult.newState;
          reflexesFired.push({
            reflex: reflexResult.reflex,
            trigger_step: 'T6',
            from_state: prevState,
            to_state: reflexResult.newState,
          });
          console.log(`[ops:life] IMMUNE: ${reflexResult.reflex} fired → ${reflexResult.newState}`);
        }
      }
    }
  } catch { /* fail-safe: doctor ingestion is best-effort */ }
}

// =========================================================================
// PHASE 4.5: IMMUNE RESPONSE (Healing Loop)
// =========================================================================
let healingAttempted = false;
let healingSucceeded = false;
const healingActions = [];

if (currentState === 'DEGRADED') {
  console.log('[ops:life] IMMUNE: organism DEGRADED — attempting healing loop');
  healingAttempted = true;

  // Try T06: DEGRADED → HEALING
  const t06Result = executeTransition(bus, currentState, 'T06_DEGRADED_TO_HEALING', {
    trigger: 'immune_response',
    doctor_verdict: latestDoctorVerdict,
  });

  if (t06Result.success) {
    currentState = t06Result.newState; // HEALING
    console.log('[ops:life] IMMUNE: entered HEALING — healAll() executed by T06 action');

    // Read heal receipt for actions log
    try {
      const evidDir = path.join(ROOT, 'reports', 'evidence');
      const healDirs = fs.readdirSync(evidDir)
        .filter((d) => d.startsWith('EPOCH-HEAL-')).sort();
      if (healDirs.length > 0) {
        const latest = healDirs[healDirs.length - 1];
        const receiptPath = path.join(evidDir, latest, 'HEAL_RECEIPT.json');
        if (fs.existsSync(receiptPath)) {
          const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
          healingActions.push(...(receipt.actions ?? []));
        }
      }
    } catch { /* fail-safe */ }

    // Try T07: HEALING → BOOT
    const t07Result = executeTransition(bus, currentState, 'T07_HEALING_TO_BOOT', {
      trigger: 'heal_complete_check',
      heals_applied: healingActions.filter((a) => a.healed).length,
    });

    if (t07Result.success) {
      currentState = t07Result.newState; // BOOT
      healingSucceeded = true;
      console.log('[ops:life] IMMUNE: healed → BOOT. Next run will attempt certification.');

      bus.append({
        mode: stateToMode(currentState),
        component: 'LIFE',
        event: 'IMMUNE_HEALED',
        reason_code: 'LIFE_IMMUNE_HEALED',
        surface: 'CONTRACT',
        attrs: { from: 'DEGRADED', to: 'BOOT', method: 'healAll' },
      });
    } else {
      currentState = t07Result.newState; // stays DEGRADED (on_fail)
      console.log('[ops:life] IMMUNE: heal verification FAILED — staying DEGRADED');

      bus.append({
        mode: stateToMode(currentState),
        component: 'LIFE',
        event: 'IMMUNE_HEAL_FAILED',
        reason_code: 'LIFE_IMMUNE_HEAL_FAILED',
        surface: 'CONTRACT',
        attrs: { reason: 'guard_heal_complete failed after healAll' },
      });
    }
  } else {
    console.log('[ops:life] IMMUNE: not healable — staying DEGRADED (manual intervention needed)');
  }
}

console.log('');

// =========================================================================
// PHASE 4.7: METAAGENT TICK — Fleet Consciousness (G12)
// =========================================================================
let fleetResult = null;
{
  try {
    // Load candidates from registry
    const regPath = path.join(ROOT, 'reports', 'evidence', 'EXECUTOR', 'CANDIDATE_REGISTRY.json');
    let candidatesData = [];
    if (fs.existsSync(regPath)) {
      const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
      candidatesData = reg.candidates ?? [];
    }

    const agent = new MetaAgent(candidatesData, bus, RUN_ID, stateToMode(currentState));
    fleetResult = agent.tick();

    // CRIT-02 FIX: Write back updated candidate states to registry
    if (fs.existsSync(regPath)) {
      const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
      reg.candidates = agent.getCandidatesData();
      writeJsonDeterministic(regPath, reg);
    }

    if (fleetResult.decisions.length > 0) {
      console.log(`[ops:life] METAAGENT: ${fleetResult.decisions.length} fleet decision(s)`);
      for (const d of fleetResult.decisions) {
        console.log(`         ${d.action}: ${d.candidate} — ${d.reason}`);
      }
    } else {
      console.log('[ops:life] METAAGENT: fleet scan complete — no decisions');
    }
  } catch (e) {
    console.log(`[ops:life] METAAGENT: tick failed — ${e.message}`);
    fleetResult = { decisions: [], fleet_context: { total_candidates: 0 } };
  }
}

console.log('');

// =========================================================================
// PHASE 5: SEAL
// =========================================================================

// Compute life outcome
let lifeOutcome;
if (healingSucceeded) {
  lifeOutcome = 'HEALED';
} else if (consciousnessResult.reached && reflexesFired.length === 0 &&
    stepResults.every((s) => s.status === 'PASS')) {
  lifeOutcome = 'ALIVE';
} else if (consciousnessResult.reached && stepResults.some((s) => s.status !== 'PASS')) {
  lifeOutcome = 'IMPAIRED';
} else if (reflexesFired.some((r) => r.reflex === 'degradation_reflex' || r.reflex === 'immune_reflex')) {
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
  HEALED: 'LIFE_OUTCOME_HEALED',
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
  // BUG-G: Derive specific guidance from consciousness failure reason
  const reason = consciousnessResult.reason;
  if (reason === 'no_valid_path') {
    oneNextAction = 'Check FSM guards — no path to goal from ' + consciousnessResult.final_state;
  } else {
    // Try to read toolchain next_action from receipt (same as old S01 BLOCKED path)
    // check if step.id === 'S01' equivalent failed with result.status === 'BLOCKED'
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
}

// ---------------------------------------------------------------------------
// Write LIFE_SUMMARY.json v4
// ---------------------------------------------------------------------------
writeJsonDeterministic(path.join(EPOCH_DIR, 'LIFE_SUMMARY.json'), {
  schema_version: '4.0.0',
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

  // EPOCH-71: IMMUNE DATA
  immune: {
    doctor_ran: stepResults.some((s) => s.step_id === 'T6'),
    doctor_verdict: latestDoctorVerdict,
    doctor_score: doctorScore,
    healing_attempted: healingAttempted,
    healing_succeeded: healingSucceeded,
    healing_actions: healingActions,
  },

  // EPOCH-72: FLEET DATA
  fleet: fleetResult ? {
    total_candidates: fleetResult.fleet_context.total_candidates,
    by_state: fleetResult.fleet_context.by_state ?? {},
    fleet_health: fleetResult.fleet_context.fleet_health ?? 1.0,
    decisions: fleetResult.decisions.map(d => ({
      action: d.action, hack_id: d.candidate, reason: d.reason,
    })),
    risk_budget_used: fleetResult.fleet_context.risk_budget_used ?? 0,
  } : null,

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
// Write LIFE_SUMMARY.md v4
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
  '## IMMUNE',
  `DOCTOR_VERDICT: ${latestDoctorVerdict ?? 'N/A'}`,
  `DOCTOR_SCORE: ${doctorScore}`,
  `HEALING_ATTEMPTED: ${healingAttempted}`,
  `HEALING_SUCCEEDED: ${healingSucceeded}`,
  healingActions.length > 0
    ? healingActions.map((a) => `- ${a.action}: ${a.healed ? 'HEALED' : 'SKIP'} — ${a.detail}`).join('\n')
    : '- No healing actions',
  '',
  '## FLEET',
  fleetResult ? `TOTAL_CANDIDATES: ${fleetResult.fleet_context.total_candidates}` : 'N/A',
  fleetResult ? `FLEET_HEALTH: ${fleetResult.fleet_context.fleet_health}` : '',
  fleetResult ? `RISK_BUDGET_USED: ${fleetResult.fleet_context.risk_budget_used}` : '',
  fleetResult && fleetResult.decisions.length > 0
    ? fleetResult.decisions.map(d => `- ${d.action}: ${d.candidate} — ${d.reason}`).join('\n')
    : '- No fleet decisions',
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
if (latestDoctorVerdict) console.log(`  DOCTOR: ${latestDoctorVerdict} score=${doctorScore}`);
if (healingAttempted) console.log(`  HEALING: attempted=${healingAttempted} succeeded=${healingSucceeded}`);
if (fleetResult) console.log(`  FLEET: ${fleetResult.fleet_context.total_candidates} candidates, health=${fleetResult.fleet_context.fleet_health}, decisions=${fleetResult.decisions.length}`);
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
