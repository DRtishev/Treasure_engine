/**
 * canary_governor.mjs — Micro-Live Canary Safety Governor
 *
 * Enforces Sprint 3 absolute guardrails for micro-live canary trading.
 * Limits are HARDCODED and non-negotiable per SDD-004.
 *
 * Safety Controls:
 *   - Max capital: $25
 *   - Max daily loss: $5
 *   - Max total loss: $15
 *   - Max trades per day: 1
 *   - Max concurrent positions: 1
 *   - Circuit breaker: 3 consecutive losses
 *   - Kill switch: always enabled
 */

/**
 * @typedef {Object} CanaryConfig
 * @property {string} canary_id
 * @property {string} strategy
 * @property {string} exchange
 */

/**
 * @typedef {Object} CanaryState
 * @property {number} capital_usd
 * @property {number} daily_pnl_usd
 * @property {number} total_pnl_usd
 * @property {number} daily_trades
 * @property {number} concurrent_positions
 * @property {number} consecutive_losses
 * @property {boolean} kill_switch_active
 * @property {string} kill_switch_reason
 * @property {Array} trade_history
 * @property {number} day_number
 */

// === ABSOLUTE GUARDRAILS — NON-NEGOTIABLE ===
const LIMITS = Object.freeze({
  MAX_CAPITAL_USD: 25,
  MAX_POSITION_USD: 25,
  MAX_TRADES_PER_DAY: 1,
  MAX_CONCURRENT_POSITIONS: 1,
  MAX_DAILY_LOSS_USD: 5,
  MAX_TOTAL_LOSS_USD: 15,
  CIRCUIT_BREAKER_CONSECUTIVE_LOSSES: 3,
  KILL_SWITCH_ALWAYS_ENABLED: true,
});

export { LIMITS as CANARY_LIMITS };

/**
 * Create initial canary state.
 * @param {CanaryConfig} config
 * @returns {CanaryState}
 */
export function createCanaryState(config) {
  return {
    canary_id: config.canary_id,
    strategy: config.strategy,
    exchange: config.exchange || 'binance_futures',
    capital_usd: LIMITS.MAX_CAPITAL_USD,
    daily_pnl_usd: 0,
    total_pnl_usd: 0,
    daily_trades: 0,
    concurrent_positions: 0,
    consecutive_losses: 0,
    kill_switch_active: false,
    kill_switch_reason: null,
    trade_history: [],
    day_number: 0,
  };
}

/**
 * Pre-trade safety check. ALL must pass for order to proceed.
 * @param {CanaryState} state
 * @param {Object} intent - { side, size_usd, symbol }
 * @returns {{ pass: boolean, reason: string, checks: Object }}
 */
export function preTradeCheck(state, intent) {
  const checks = {
    kill_switch_clear: !state.kill_switch_active,
    capital_within_limit: (intent.size_usd || 0) <= LIMITS.MAX_CAPITAL_USD,
    daily_trade_limit: state.daily_trades < LIMITS.MAX_TRADES_PER_DAY,
    position_limit: state.concurrent_positions < LIMITS.MAX_CONCURRENT_POSITIONS,
    daily_loss_limit: state.daily_pnl_usd > -LIMITS.MAX_DAILY_LOSS_USD,
    total_loss_limit: state.total_pnl_usd > -LIMITS.MAX_TOTAL_LOSS_USD,
    circuit_breaker_clear: state.consecutive_losses < LIMITS.CIRCUIT_BREAKER_CONSECUTIVE_LOSSES,
  };

  const pass = Object.values(checks).every(v => v);
  const failedChecks = Object.entries(checks).filter(([, v]) => !v);
  let reason = 'ALL_CLEAR';

  if (!pass) {
    reason = failedChecks.map(([k]) => k).join(', ');

    // Auto-trigger kill switch on critical failures
    if (!checks.total_loss_limit) {
      state.kill_switch_active = true;
      state.kill_switch_reason = `TOTAL_LOSS_EXCEEDED: $${Math.abs(state.total_pnl_usd).toFixed(2)} > $${LIMITS.MAX_TOTAL_LOSS_USD}`;
    }
    if (!checks.daily_loss_limit) {
      state.kill_switch_active = true;
      state.kill_switch_reason = `DAILY_LOSS_EXCEEDED: $${Math.abs(state.daily_pnl_usd).toFixed(2)} > $${LIMITS.MAX_DAILY_LOSS_USD}`;
    }
    if (!checks.circuit_breaker_clear) {
      state.kill_switch_active = true;
      state.kill_switch_reason = `CIRCUIT_BREAKER: ${state.consecutive_losses} consecutive losses`;
    }
  }

  return { pass, reason, checks };
}

/**
 * Post-trade update. Updates state after a trade completes.
 * @param {CanaryState} state
 * @param {Object} trade - { pnl_usd, side, symbol, fill_price, fill_qty }
 * @returns {{ state: CanaryState, kill_triggered: boolean }}
 */
export function postTradeUpdate(state, trade) {
  const pnl = trade.pnl_usd || 0;

  state.daily_pnl_usd += pnl;
  state.total_pnl_usd += pnl;
  state.daily_trades += 1;

  // Track consecutive losses
  if (pnl < 0) {
    state.consecutive_losses += 1;
  } else {
    state.consecutive_losses = 0;
  }

  // Record trade
  state.trade_history.push({
    day: state.day_number,
    pnl_usd: pnl,
    side: trade.side,
    symbol: trade.symbol,
  });

  // Auto-kill triggers
  let killTriggered = false;
  if (state.daily_pnl_usd <= -LIMITS.MAX_DAILY_LOSS_USD) {
    state.kill_switch_active = true;
    state.kill_switch_reason = `DAILY_LOSS: $${Math.abs(state.daily_pnl_usd).toFixed(2)}`;
    killTriggered = true;
  }
  if (state.total_pnl_usd <= -LIMITS.MAX_TOTAL_LOSS_USD) {
    state.kill_switch_active = true;
    state.kill_switch_reason = `TOTAL_LOSS: $${Math.abs(state.total_pnl_usd).toFixed(2)}`;
    killTriggered = true;
  }
  if (state.consecutive_losses >= LIMITS.CIRCUIT_BREAKER_CONSECUTIVE_LOSSES) {
    state.kill_switch_active = true;
    state.kill_switch_reason = `CIRCUIT_BREAKER: ${state.consecutive_losses} losses`;
    killTriggered = true;
  }

  return { state, kill_triggered: killTriggered };
}

/**
 * Reset daily counters (call at start of each trading day).
 * @param {CanaryState} state
 */
export function resetDaily(state) {
  state.daily_pnl_usd = 0;
  state.daily_trades = 0;
  state.day_number += 1;
}

/**
 * Manual kill switch activation.
 * @param {CanaryState} state
 * @param {string} reason
 */
export function activateKillSwitch(state, reason) {
  state.kill_switch_active = true;
  state.kill_switch_reason = reason || 'MANUAL';
}

/**
 * Get canary diagnostics.
 * @param {CanaryState} state
 * @returns {Object} Dashboard data
 */
export function getCanaryDashboard(state) {
  const totalTrades = state.trade_history.length;
  const wins = state.trade_history.filter(t => t.pnl_usd > 0).length;
  const losses = state.trade_history.filter(t => t.pnl_usd < 0).length;

  return {
    canary_id: state.canary_id,
    strategy: state.strategy,
    day_number: state.day_number,
    capital_usd: state.capital_usd,
    total_pnl_usd: state.total_pnl_usd,
    daily_pnl_usd: state.daily_pnl_usd,
    total_trades: totalTrades,
    wins,
    losses,
    win_rate: totalTrades > 0 ? wins / totalTrades : null,
    consecutive_losses: state.consecutive_losses,
    kill_switch_active: state.kill_switch_active,
    kill_switch_reason: state.kill_switch_reason,
    limits: { ...LIMITS },
  };
}
