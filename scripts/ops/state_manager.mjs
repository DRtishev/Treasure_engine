/**
 * state_manager.mjs — EPOCH-69 Organism Brain FSM State Manager
 *
 * The FSM executor. Derives state from event log, validates transitions,
 * executes actions, triggers compensations.
 *
 * EPOCH-69 GENIUS additions:
 *   G1: findPathToGoal() + runToGoal() — BFS goal-seeking orchestration
 *   G2: Circuit breaker per transition — stops infinite retry loops
 *   G3: Transition time budget — timeout_ms from kernel
 *   G7: writeWatermark() — crash recovery checkpoint
 *
 * Exports:
 *   loadFsmKernel()                    — parse and return specs/fsm_kernel.json
 *   replayState(events, targetTick?)   — derive state from log (with watermark fallback)
 *   getAvailableTransitions(state)     — list valid transitions from state
 *   findPathToGoal(fromState, goalState) — BFS shortest path (G1)
 *   isTransitionValid(state, transId)  — quick validity check
 *   executeTransition(bus, state, transId, context?) — full execution
 *   runToGoal(bus, goalState, maxAttempts?) — goal-seeking loop (G1)
 *   writeWatermark(state)              — crash recovery (G7)
 *   checkCircuitBreaker(transitionId)  — breaker query (G2)
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { GUARD_REGISTRY } from './fsm_guards.mjs';
import { COMPENSATION_REGISTRY } from './fsm_compensations.mjs';

const ROOT = process.cwd();

// ---------------------------------------------------------------------------
// loadFsmKernel() — parse specs/fsm_kernel.json
// ---------------------------------------------------------------------------
let _cachedKernel = null;

export function loadFsmKernel() {
  if (_cachedKernel) return _cachedKernel;

  const kernelPath = path.join(ROOT, 'specs', 'fsm_kernel.json');
  if (!fs.existsSync(kernelPath)) {
    throw new Error('FSM_KERNEL_LOAD_ERROR: specs/fsm_kernel.json not found');
  }

  let raw;
  try {
    raw = fs.readFileSync(kernelPath, 'utf8');
  } catch (e) {
    throw new Error(`FSM_KERNEL_LOAD_ERROR: cannot read fsm_kernel.json: ${e.message}`);
  }

  let kernel;
  try {
    kernel = JSON.parse(raw);
  } catch (e) {
    throw new Error(`FSM_KERNEL_LOAD_ERROR: cannot parse fsm_kernel.json: ${e.message}`);
  }

  // Structural validation
  if (!kernel.initial_state || !kernel.states || !kernel.transitions) {
    throw new Error('FSM_KERNEL_LOAD_ERROR: kernel missing required fields (initial_state, states, transitions)');
  }
  if (!(kernel.initial_state in kernel.states)) {
    throw new Error(`FSM_KERNEL_LOAD_ERROR: initial_state "${kernel.initial_state}" not in states`);
  }

  _cachedKernel = kernel;
  return kernel;
}

/**
 * Reset cached kernel (for testing)
 */
export function _resetKernelCache() {
  _cachedKernel = null;
}

// ---------------------------------------------------------------------------
// STATE_TO_MODE — derive mode from state (backward-compatible)
// ---------------------------------------------------------------------------
export function stateToMode(state) {
  const kernel = loadFsmKernel();
  const stateObj = kernel.states[state];
  if (!stateObj) return 'LIFE'; // fallback
  return stateObj.mode;
}

// ---------------------------------------------------------------------------
// G2: CIRCUIT BREAKER — in-memory per-session state
// ---------------------------------------------------------------------------
const _breakerState = {}; // transitionId → { failures: N, open: boolean }

function getBreakerThreshold() {
  try {
    const kernel = loadFsmKernel();
    return kernel.circuit_breaker?.threshold ?? 3;
  } catch {
    return 3;
  }
}

function isBreakerApplicable(transitionId) {
  try {
    const kernel = loadFsmKernel();
    const appliesTo = kernel.circuit_breaker?.applies_to ?? [];
    return appliesTo.includes(transitionId);
  } catch {
    return false;
  }
}

export function recordTransitionFailure(transitionId) {
  if (!isBreakerApplicable(transitionId)) return;
  if (!_breakerState[transitionId]) {
    _breakerState[transitionId] = { failures: 0, open: false };
  }
  _breakerState[transitionId].failures++;
  if (_breakerState[transitionId].failures >= getBreakerThreshold()) {
    _breakerState[transitionId].open = true;
  }
}

export function recordTransitionSuccess(transitionId) {
  _breakerState[transitionId] = { failures: 0, open: false };
}

export function checkCircuitBreaker(transitionId) {
  return _breakerState[transitionId]?.open ?? false;
}

export function getCircuitBreakerState() {
  try {
    const kernel = loadFsmKernel();
    const cb = kernel.circuit_breaker;
    if (!cb) return {};
    const result = {};
    for (const tid of cb.applies_to ?? []) {
      const s = _breakerState[tid];
      result[tid] = {
        failures: s?.failures ?? 0,
        threshold: cb.threshold ?? 3,
        open: s?.open ?? false,
      };
    }
    return result;
  } catch {
    return { ..._breakerState };
  }
}

export function _resetCircuitBreakers() {
  for (const key of Object.keys(_breakerState)) {
    delete _breakerState[key];
  }
}

// ---------------------------------------------------------------------------
// G7: WATERMARK — crash recovery checkpoint
// ---------------------------------------------------------------------------
const WATERMARK_DIR = path.join(ROOT, 'artifacts', 'fsm');
const WATERMARK_PATH = path.join(WATERMARK_DIR, 'WATERMARK.json');

export function writeWatermark(state, tick = 0, runId = '') {
  try {
    fs.mkdirSync(WATERMARK_DIR, { recursive: true });
    const watermark = {
      state,
      tick,
      run_id: runId,
      written_at_tick: tick,
    };
    fs.writeFileSync(WATERMARK_PATH, JSON.stringify(watermark, null, 2) + '\n');
    return { state, tick, written: true };
  } catch {
    return { state, tick, written: false };
  }
}

export function readWatermark() {
  try {
    if (!fs.existsSync(WATERMARK_PATH)) return null;
    return JSON.parse(fs.readFileSync(WATERMARK_PATH, 'utf8'));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// replayState(events, targetTick?) — derive current state from event log
// G7: Falls back to watermark if EventBus is empty
// ---------------------------------------------------------------------------
export function replayState(events, targetTick = Infinity) {
  const kernel = loadFsmKernel();
  let state = kernel.initial_state; // BOOT
  const transitions = [];

  // Primary: derive from events (authoritative)
  if (events && events.length > 0) {
    for (const event of events) {
      if (event.tick > targetTick) break;
      if (event.event === 'STATE_TRANSITION' && event.component === 'FSM' && event.attrs && event.attrs.to_state) {
        const fromState = event.attrs.from_state || state;
        state = event.attrs.to_state;
        transitions.push({
          tick: event.tick,
          from: fromState,
          to: event.attrs.to_state,
          transition_id: event.attrs.transition_id || 'unknown',
        });
      }
    }

    return {
      state,
      mode: stateToMode(state),
      tick: targetTick === Infinity ? (events.length > 0 ? events[events.length - 1].tick : 0) : targetTick,
      transitions,
      transitions_count: transitions.length,
    };
  }

  // Fallback: check watermark (G7 crash recovery)
  const watermark = readWatermark();
  if (watermark && watermark.state && watermark.state in kernel.states) {
    return {
      state: watermark.state,
      mode: stateToMode(watermark.state),
      tick: watermark.tick ?? 0,
      transitions: [],
      transitions_count: 0,
      source: 'watermark',
    };
  }

  // No events, no watermark: fresh start
  return {
    state: kernel.initial_state,
    mode: stateToMode(kernel.initial_state),
    tick: 0,
    transitions: [],
    transitions_count: 0,
  };
}

// ---------------------------------------------------------------------------
// isForbidden(from, to) — check if transition pair is forbidden
// ---------------------------------------------------------------------------
function isForbidden(from, to) {
  const kernel = loadFsmKernel();
  const forbidden = kernel.forbidden_transitions || [];
  return forbidden.some((f) => f.from === from && f.to === to);
}

// ---------------------------------------------------------------------------
// getAvailableTransitions(currentState) — list valid transitions
// G2: Filters circuit-breaker-open transitions
// ---------------------------------------------------------------------------
export function getAvailableTransitions(currentState) {
  const kernel = loadFsmKernel();
  const available = [];

  for (const [id, trans] of Object.entries(kernel.transitions)) {
    // Check "from" match: exact state or wildcard
    if (trans.from !== '*' && trans.from !== currentState) continue;

    // Wildcard T05 should not trigger from BOOT
    if (trans.from === '*' && currentState === 'BOOT') continue;

    // Check not forbidden
    if (isForbidden(currentState, trans.to)) continue;

    // Check not self-loop to same state (unless explicitly defined)
    if (trans.to === currentState && trans.from !== '*') continue;

    available.push({ id, ...trans });
  }

  return available;
}

// ---------------------------------------------------------------------------
// isTransitionValid(currentState, transitionId) — quick validity check
// ---------------------------------------------------------------------------
export function isTransitionValid(currentState, transitionId) {
  const available = getAvailableTransitions(currentState);
  return available.some((t) => t.id === transitionId);
}

// ---------------------------------------------------------------------------
// G1: findPathToGoal(fromState, goalState) — BFS shortest path
// Returns array of transitions (shortest path) or [] (no path)
// ---------------------------------------------------------------------------
export function findPathToGoal(fromState, goalState) {
  if (fromState === goalState) return [];

  const kernel = loadFsmKernel();
  const queue = [{ state: fromState, path: [] }];
  const visited = new Set([fromState]);

  while (queue.length > 0) {
    const { state, path: currentPath } = queue.shift();
    const transitions = getAvailableTransitions(state);

    for (const transition of transitions) {
      const nextState = transition.to;
      if (visited.has(nextState)) continue;

      // Skip circuit-breaker-open transitions in path planning
      if (checkCircuitBreaker(transition.id)) continue;

      const newPath = [...currentPath, transition];
      if (nextState === goalState) return newPath;

      visited.add(nextState);
      queue.push({ state: nextState, path: newPath });
    }
  }

  return []; // no path exists
}

// ---------------------------------------------------------------------------
// executeTransition(bus, currentState, transitionId, context?) — full execution
//
// Phases: validate → guard → action (with timeout G3, x2 G3) → compensate → emit
// G2: Records failures/successes for circuit breaker
// G7: Writes watermark after state change
// ---------------------------------------------------------------------------
export function executeTransition(bus, currentState, transitionId, context = {}) {
  const kernel = loadFsmKernel();
  const transition = kernel.transitions[transitionId];

  if (!transition) {
    if (bus) {
      bus.append({
        mode: stateToMode(currentState),
        component: 'FSM',
        event: 'TRANSITION_REJECTED',
        reason_code: 'FSM_INVALID_TRANSITION',
        surface: 'CONTRACT',
        attrs: { transition_id: transitionId, current_state: currentState, detail: 'transition not found' },
      });
    }
    return { success: false, newState: currentState, reason: 'FSM_INVALID_TRANSITION' };
  }

  // Phase 1: Validate
  if (transition.from !== '*' && transition.from !== currentState) {
    if (bus) {
      bus.append({
        mode: stateToMode(currentState),
        component: 'FSM',
        event: 'TRANSITION_REJECTED',
        reason_code: 'FSM_INVALID_TRANSITION',
        surface: 'CONTRACT',
        attrs: { transition_id: transitionId, current_state: currentState, required_from: transition.from },
      });
    }
    return { success: false, newState: currentState, reason: 'FSM_INVALID_TRANSITION' };
  }

  if (isForbidden(currentState, transition.to)) {
    const reason = (kernel.forbidden_transitions || []).find((f) => f.from === currentState && f.to === transition.to);
    if (bus) {
      bus.append({
        mode: stateToMode(currentState),
        component: 'FSM',
        event: 'TRANSITION_FORBIDDEN',
        reason_code: 'FSM_FORBIDDEN',
        surface: 'CONTRACT',
        attrs: { transition_id: transitionId, from_state: currentState, to_state: transition.to, reason: reason?.reason || 'forbidden' },
      });
    }
    return { success: false, newState: currentState, reason: 'FSM_FORBIDDEN' };
  }

  // G2: Check circuit breaker
  if (checkCircuitBreaker(transitionId)) {
    if (bus) {
      bus.append({
        mode: stateToMode(currentState),
        component: 'FSM',
        event: 'CIRCUIT_BREAKER_OPEN',
        reason_code: 'FSM_ACTION_FAIL',
        surface: 'CONTRACT',
        attrs: {
          transition_id: transitionId,
          failures: String(_breakerState[transitionId]?.failures ?? 0),
          threshold: String(getBreakerThreshold()),
        },
      });
    }
    return { success: false, newState: currentState, reason: 'CIRCUIT_BREAKER_OPEN' };
  }

  // Phase 2: Guard
  const guardFn = GUARD_REGISTRY[transition.guard];
  if (!guardFn) {
    if (bus) {
      bus.append({
        mode: stateToMode(currentState),
        component: 'FSM',
        event: 'GUARD_FAILED',
        reason_code: 'FSM_GUARD_FAIL',
        surface: 'CONTRACT',
        attrs: { transition_id: transitionId, guard: transition.guard, detail: 'guard function not found in registry' },
      });
    }
    return { success: false, newState: currentState, reason: 'FSM_GUARD_FAIL' };
  }

  const guardResult = guardFn(context);
  if (bus) {
    bus.append({
      mode: stateToMode(currentState),
      component: 'FSM',
      event: 'GUARD_CHECK',
      reason_code: guardResult.pass ? 'NONE' : 'FSM_GUARD_FAIL',
      surface: 'CONTRACT',
      attrs: { transition_id: transitionId, guard: transition.guard, pass: String(guardResult.pass), detail: guardResult.detail },
    });
  }

  if (!guardResult.pass) {
    return { success: false, newState: currentState, reason: 'FSM_GUARD_FAIL', guardDetail: guardResult.detail };
  }

  // Phase 3: Action (with G3 timeout_ms and action_x2 support)
  if (transition.action && transition.action !== 'self_heal') {
    const timeoutMs = transition.timeout_ms ?? 300_000;
    const actionParts = transition.action.replace('npm run -s ', '').split(' ');
    const runCount = transition.action_x2 ? 2 : 1;

    for (let run = 1; run <= runCount; run++) {
      const result = spawnSync('npm', ['run', '-s', ...actionParts], {
        cwd: ROOT,
        stdio: 'pipe',
        encoding: 'utf8',
        timeout: timeoutMs,
      });

      const timedOut = result.signal === 'SIGTERM' || result.signal === 'SIGKILL';

      if (result.status !== 0 || timedOut) {
        const failReason = timedOut ? 'TIMEOUT' : 'ACTION_FAIL';
        if (bus) {
          bus.append({
            mode: stateToMode(currentState),
            component: 'FSM',
            event: 'TRANSITION_FAILED',
            reason_code: 'FSM_ACTION_FAIL',
            surface: 'CONTRACT',
            attrs: {
              transition_id: transitionId,
              action: transition.action,
              exit_code: String(result.status ?? -1),
              reason: failReason,
              run_number: String(run),
              budget_ms: String(timeoutMs),
            },
          });
        }

        // Phase 3a: Compensate
        if (transition.compensation) {
          const compFn = COMPENSATION_REGISTRY[transition.compensation];
          if (compFn) {
            const compResult = compFn();
            if (bus) {
              bus.append({
                mode: stateToMode(currentState),
                component: 'FSM',
                event: 'COMPENSATION_EXECUTED',
                reason_code: compResult.compensated ? 'NONE' : 'FSM_COMPENSATION_FAIL',
                surface: 'CONTRACT',
                attrs: { transition_id: transitionId, compensation: transition.compensation, compensated: String(compResult.compensated), detail: compResult.detail },
              });
            }
          }
        }

        const failState = transition.on_fail === 'stay' ? currentState : transition.on_fail;

        // G2: Record failure
        recordTransitionFailure(transitionId);

        if (bus) {
          bus.append({
            mode: stateToMode(failState),
            component: 'FSM',
            event: 'STATE_TRANSITION',
            reason_code: 'FSM_FAIL_RECOVERY',
            surface: 'CONTRACT',
            attrs: { transition_id: transitionId, from_state: currentState, to_state: failState, trigger: 'action_failure' },
          });

          // G2: Emit circuit breaker event if just opened
          if (checkCircuitBreaker(transitionId)) {
            bus.append({
              mode: stateToMode(failState),
              component: 'FSM',
              event: 'CIRCUIT_BREAKER_OPEN',
              reason_code: 'FSM_ACTION_FAIL',
              surface: 'CONTRACT',
              attrs: {
                transition_id: transitionId,
                failures: String(_breakerState[transitionId]?.failures ?? 0),
                threshold: String(getBreakerThreshold()),
              },
            });
          }
        }

        // G7: Write watermark for crash recovery (BUG-12: pass tick/runId)
        const failTick = bus ? bus.events().length : 0;
        const failRunId = bus?.runId ?? '';
        const failWm = writeWatermark(failState, failTick, failRunId);
        if (bus && failWm.written) {
          bus.append({
            mode: stateToMode(failState),
            component: 'FSM',
            event: 'WATERMARK_WRITTEN',
            reason_code: 'NONE',
            surface: 'CONTRACT',
            attrs: { state: failState, tick: String(failTick) },
          });
        }

        return { success: false, newState: failState, reason: 'FSM_ACTION_FAIL' };
      }
    }
  }

  // Phase 4: Commit
  // G2: Record success
  recordTransitionSuccess(transitionId);

  if (bus) {
    bus.append({
      mode: stateToMode(transition.to),
      component: 'FSM',
      event: 'STATE_TRANSITION',
      reason_code: 'NONE',
      surface: 'CONTRACT',
      attrs: { transition_id: transitionId, from_state: currentState, to_state: transition.to },
    });
  }

  // G7: Write watermark (BUG-12: pass tick/runId, BUG-13: emit event)
  const successTick = bus ? bus.events().length : 0;
  const successRunId = bus?.runId ?? '';
  const successWm = writeWatermark(transition.to, successTick, successRunId);
  if (bus && successWm.written) {
    bus.append({
      mode: stateToMode(transition.to),
      component: 'FSM',
      event: 'WATERMARK_WRITTEN',
      reason_code: 'NONE',
      surface: 'CONTRACT',
      attrs: { state: transition.to, tick: String(successTick) },
    });
  }

  return { success: true, newState: transition.to };
}

// ---------------------------------------------------------------------------
// G1: runToGoal(bus, goalState, maxAttempts?) — goal-seeking orchestration
//
// Algorithm: keep transitioning along BFS-shortest path until goal reached.
// Respects circuit breakers, max attempts, and max cycles.
//
// BUG-01 FIX: totalFailures is monotonic (never reset on success).
// BUG-02 FIX: cycleCount tracks returns to initial_state, enforces max_cycles.
//
// Returns: { reached, finalState, totalFailures, cycleCount, history[], reason? }
// ---------------------------------------------------------------------------
export function runToGoal(bus, goalState, maxAttempts = null) {
  const kernel = loadFsmKernel();
  const maxAtt = maxAttempts ?? kernel.max_goal_attempts ?? 10;
  const maxCycles = kernel.max_cycles ?? 3;
  let totalFailures = 0;
  let cycleCount = 0;
  const history = [];

  while (totalFailures < maxAtt) {
    const allEvents = bus ? bus.events() : [];
    const { state: currentState } = replayState(allEvents);

    if (currentState === goalState) {
      if (bus) {
        bus.append({
          mode: stateToMode(currentState),
          component: 'FSM',
          event: 'GOAL_REACHED',
          reason_code: 'NONE',
          surface: 'CONTRACT',
          attrs: { goal: goalState, total_failures: String(totalFailures), cycle_count: String(cycleCount) },
        });
      }
      return { reached: true, finalState: currentState, totalFailures, cycleCount, history };
    }

    const pathToGoal = findPathToGoal(currentState, goalState);
    if (pathToGoal.length === 0) {
      if (bus) {
        bus.append({
          mode: stateToMode(currentState),
          component: 'FSM',
          event: 'GOAL_BLOCKED',
          reason_code: 'FSM_ACTION_FAIL',
          surface: 'CONTRACT',
          attrs: { goal: goalState, reason: 'no_valid_path', current_state: currentState },
        });
      }
      return { reached: false, finalState: currentState, totalFailures, cycleCount, history, reason: 'no_valid_path' };
    }

    const nextTransition = pathToGoal[0];

    // Check circuit breaker
    if (checkCircuitBreaker(nextTransition.id)) {
      if (bus) {
        bus.append({
          mode: stateToMode(currentState),
          component: 'FSM',
          event: 'GOAL_BLOCKED',
          reason_code: 'FSM_ACTION_FAIL',
          surface: 'CONTRACT',
          attrs: { goal: goalState, reason: 'circuit_breaker_open', transition: nextTransition.id },
        });
      }
      return { reached: false, finalState: currentState, totalFailures, cycleCount, history, reason: 'circuit_breaker_open' };
    }

    const result = executeTransition(bus, currentState, nextTransition.id);
    history.push({
      from: currentState,
      to: result.newState,
      transition: nextTransition.id,
      success: result.success,
    });

    if (!result.success) {
      totalFailures++; // BUG-01 FIX: monotonic, never reset
      continue; // re-plan from new state
    }

    // BUG-02 FIX: track cycles — if we returned to initial_state, increment cycle counter
    if (result.newState === kernel.initial_state && history.length > 1) {
      cycleCount++;
      if (cycleCount >= maxCycles) {
        if (bus) {
          bus.append({
            mode: stateToMode(result.newState),
            component: 'FSM',
            event: 'GOAL_BLOCKED',
            reason_code: 'FSM_ACTION_FAIL',
            surface: 'CONTRACT',
            attrs: { goal: goalState, reason: 'max_cycles_exceeded', cycle_count: String(cycleCount), max_cycles: String(maxCycles) },
          });
        }
        return { reached: false, finalState: result.newState, totalFailures, cycleCount, history, reason: 'max_cycles_exceeded' };
      }
    }
  }

  // Max attempts exceeded
  const allEvents = bus ? bus.events() : [];
  const { state: finalState } = replayState(allEvents);
  if (bus) {
    bus.append({
      mode: stateToMode(finalState),
      component: 'FSM',
      event: 'GOAL_BLOCKED',
      reason_code: 'FSM_ACTION_FAIL',
      surface: 'CONTRACT',
      attrs: { goal: goalState, reason: 'max_attempts_exceeded', total_failures: String(totalFailures) },
    });
  }
  return { reached: false, finalState, totalFailures, cycleCount, history, reason: 'max_attempts_exceeded' };
}
