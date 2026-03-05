/**
 * TREASURE ENGINE: Safety Loop (Sprint 5 — PROFIT_LANE_WIRING)
 *
 * Purpose: Wire kill switch evaluator into the live trading loop.
 * Periodically evaluates kill switch conditions and triggers actions.
 *
 * Actions:
 *   FLATTEN → call emergencyFlatten, pause all orders
 *   PAUSE   → pause new order placement
 *   REDUCE  → downgrade position sizer tier to 'micro'
 *
 * Mode: Works with both live and paper adapters.
 * Determinism: Uses injectable clock (ctx.clock) for timestamps.
 */

import { evaluateKillSwitch } from '../risk/kill_switch.mjs';

/**
 * @typedef {Object} SafetyState
 * @property {boolean} ordersPaused - Whether new orders are paused
 * @property {string} currentTier - Current position sizer tier
 * @property {string|null} lastAction - Last triggered action
 * @property {number} lastEvalTs - Timestamp of last evaluation
 * @property {Array} history - Evaluation history
 */

/**
 * Create a SafetyLoop instance.
 *
 * @param {Object} opts
 * @param {Object} opts.matrix - Kill switch matrix (from specs/kill_switch_matrix.json)
 * @param {Function} opts.metricsProvider - () => { max_drawdown, reality_gap, exchange_error_rate, consecutive_losses }
 * @param {Function} [opts.onFlatten] - Called when FLATTEN action fires
 * @param {Function} [opts.onPause] - Called when PAUSE action fires
 * @param {Function} [opts.onReduce] - Called when REDUCE action fires
 * @param {Object} [opts.clock] - Injectable clock { now() }
 * @param {Object} [opts.eventLog] - Event log for observability
 * @returns {SafetyLoop}
 */
export function createSafetyLoop(opts) {
  const {
    matrix,
    metricsProvider,
    onFlatten = () => {},
    onPause = () => {},
    onReduce = () => {},
    clock = { now: () => Date.now() },
    eventLog = null,
  } = opts;

  /** @type {SafetyState} */
  const state = {
    ordersPaused: false,
    currentTier: 'normal',
    lastAction: null,
    lastEvalTs: 0,
    history: [],
  };

  let intervalHandle = null;

  /**
   * Evaluate kill switch once with current metrics.
   * @returns {Object} Evaluation result
   */
  function evaluate() {
    const metrics = metricsProvider();
    const result = evaluateKillSwitch(metrics, matrix);
    const ts = clock.now();

    state.lastEvalTs = ts;

    if (result.triggered) {
      state.lastAction = result.action;
      state.history.push({ ts, action: result.action, conditions: result.conditions });

      if (eventLog) {
        eventLog.write?.({
          category: 'SAFETY',
          event_type: 'kill_switch_triggered',
          level: 'ALERT',
          payload: { action: result.action, conditions: result.conditions, metrics },
        });
      }

      if (result.action === 'FLATTEN') {
        state.ordersPaused = true;
        onFlatten({ metrics, conditions: result.conditions, ts });
      } else if (result.action === 'PAUSE') {
        state.ordersPaused = true;
        onPause({ metrics, conditions: result.conditions, ts });
      } else if (result.action === 'REDUCE') {
        state.currentTier = 'micro';
        onReduce({ metrics, conditions: result.conditions, ts });
      }
    }

    return { ...result, ts, state: { ...state } };
  }

  /**
   * Start periodic evaluation.
   * @param {number} intervalMs - Evaluation interval in milliseconds
   */
  function start(intervalMs = 5000) {
    if (intervalHandle) return;
    intervalHandle = setInterval(evaluate, intervalMs);
  }

  /**
   * Stop periodic evaluation.
   */
  function stop() {
    if (intervalHandle) {
      clearInterval(intervalHandle);
      intervalHandle = null;
    }
  }

  /**
   * Reset state (e.g., after operator confirms safe).
   */
  function reset() {
    state.ordersPaused = false;
    state.currentTier = 'normal';
    state.lastAction = null;
  }

  /**
   * Get current state (read-only copy).
   */
  function getState() {
    return { ...state };
  }

  return { evaluate, start, stop, reset, getState };
}
