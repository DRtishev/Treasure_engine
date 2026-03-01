/**
 * state_manager.mjs — EPOCH-69 Organism Brain FSM State Manager
 *
 * The FSM executor. Derives state from event log, validates transitions,
 * executes actions, triggers compensations.
 *
 * Exports:
 *   loadFsmKernel()                    — parse and return specs/fsm_kernel.json
 *   replayState(events, targetTick?)   — derive state from log
 *   getAvailableTransitions(state)     — list valid transitions from state
 *   isTransitionValid(state, transId)  — quick validity check
 *   executeTransition(bus, state, transId, context?) — full execution
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
// replayState(events, targetTick?) — derive current state from event log
// ---------------------------------------------------------------------------
export function replayState(events, targetTick = Infinity) {
  const kernel = loadFsmKernel();
  let state = kernel.initial_state; // BOOT
  const transitions = [];

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
// executeTransition(bus, currentState, transitionId, context?) — full execution
//
// Phases: validate → guard → action → compensate → emit
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
      attrs: { transition_id: transitionId, guard: transition.guard, pass: guardResult.pass, detail: guardResult.detail },
    });
  }

  if (!guardResult.pass) {
    return { success: false, newState: currentState, reason: 'FSM_GUARD_FAIL', guardDetail: guardResult.detail };
  }

  // Phase 3: Action
  if (transition.action && transition.action !== 'self_heal') {
    const result = spawnSync('npm', ['run', '-s', ...transition.action.replace('npm run -s ', '').split(' ')], {
      cwd: ROOT,
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 300_000, // 5 min
    });

    if (result.status !== 0) {
      if (bus) {
        bus.append({
          mode: stateToMode(currentState),
          component: 'FSM',
          event: 'TRANSITION_FAILED',
          reason_code: 'FSM_ACTION_FAIL',
          surface: 'CONTRACT',
          attrs: { transition_id: transitionId, action: transition.action, exit_code: result.status },
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
              attrs: { transition_id: transitionId, compensation: transition.compensation, compensated: compResult.compensated, detail: compResult.detail },
            });
          }
        }
      }

      const failState = transition.on_fail === 'stay' ? currentState : transition.on_fail;
      if (bus) {
        bus.append({
          mode: stateToMode(failState),
          component: 'FSM',
          event: 'STATE_TRANSITION',
          reason_code: 'FSM_FAIL_RECOVERY',
          surface: 'CONTRACT',
          attrs: { transition_id: transitionId, from_state: currentState, to_state: failState, trigger: 'action_failure' },
        });
      }
      return { success: false, newState: failState, reason: 'FSM_ACTION_FAIL' };
    }
  }

  // Phase 4: Commit
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

  return { success: true, newState: transition.to };
}
