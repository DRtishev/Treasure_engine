/**
 * kill_switch.mjs — Fail-closed kill switch evaluator
 *
 * Sprint 3: Evaluates live metrics against kill_switch_matrix conditions.
 * Highest priority action wins (FLATTEN > PAUSE > REDUCE).
 * Pure function, deterministic, no side effects.
 */

/**
 * Evaluate kill switch conditions against current metrics.
 * @param {Object} metrics — current live metrics { max_drawdown, reality_gap, exchange_error_rate, consecutive_losses, ... }
 * @param {Object} matrix — kill_switch_matrix.json parsed object
 * @returns {{ triggered: boolean, action: string|null, conditions: Object[] }}
 */
export function evaluateKillSwitch(metrics, matrix) {
  if (!matrix || !Array.isArray(matrix.conditions)) {
    return { triggered: false, action: null, conditions: [], error: 'invalid matrix' };
  }

  const triggered = [];
  for (const cond of matrix.conditions) {
    const value = metrics[cond.metric];
    if (value === undefined || value === null) continue;

    let fire = false;
    if (cond.operator === '>') fire = value > cond.threshold;
    else if (cond.operator === '>=') fire = value >= cond.threshold;
    else if (cond.operator === '<') fire = value < cond.threshold;
    else if (cond.operator === '<=') fire = value <= cond.threshold;
    else if (cond.operator === '===') fire = value === cond.threshold;

    if (fire) {
      triggered.push({ ...cond, actual_value: value });
    }
  }

  if (triggered.length === 0) {
    return { triggered: false, action: null, conditions: [] };
  }

  // Highest priority action wins (lowest priority number = highest priority)
  triggered.sort((a, b) => {
    const pa = matrix.actions[a.action]?.priority ?? 999;
    const pb = matrix.actions[b.action]?.priority ?? 999;
    return pa - pb;
  });

  return { triggered: true, action: triggered[0].action, conditions: triggered };
}
