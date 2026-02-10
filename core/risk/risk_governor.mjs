// core/risk/risk_governor.mjs
// Risk Governor — критический компонент управления рисками
// Принцип: FAIL-SAFE. По умолчанию BLOCK если что-то пошло не так.
// Kill switch — мгновенная остановка при превышении критических порогов.

/**
 * Risk Governor State
 * Tracks current risk metrics and caps usage
 */
export class RiskGovernorState {
  constructor(config = {}, now_ms = null) {
    this.config = config;
    this.peak_equity = 0;
    this.current_equity = 0;
    this.current_position_size_usd = 0;
    this.daily_pnl = 0;
    this.daily_trade_count = 0;
    this.last_reset_timestamp = now_ms !== null ? now_ms : Date.now();
    this.kill_switch_active = false;
    this.kill_switch_reason = null;
    this.circuit_breaker_until = null; // timestamp
    this.trade_history = [];
  }
  
  /**
   * Reset daily counters (called at start of new trading day)
   */
  resetDaily(now_ms = null) {
    this.daily_pnl = 0;
    this.daily_trade_count = 0;
    this.last_reset_timestamp = now_ms !== null ? now_ms : Date.now();
  }
  
  /**
   * Update equity and peak tracking
   */
  updateEquity(equity) {
    this.current_equity = equity;
    if (equity > this.peak_equity) {
      this.peak_equity = equity;
    }
  }
  
  /**
   * Compute current drawdown from peak
   */
  getCurrentDrawdown() {
    if (this.peak_equity <= 0) return 0;
    return Math.max(0, (this.peak_equity - this.current_equity) / this.peak_equity);
  }
}

/**
 * Pre-check: Can we enter this trade?
 * @param {Object} signal - Trade signal
 * @param {RiskGovernorState} state - Current risk state
 * @param {Object} ssot - SSOT configuration
 * @param {number} now_ms - Current timestamp (for determinism)
 * @param {Object} eventLog - Optional EventLog instance for observability
 * @returns {Object} {pass: boolean, reason: string, caps: Object}
 */
export function preCheck(signal, state, ssot, now_ms = null, eventLog = null) {
  const config = ssot.risk_governor || {};
  const currentTime = now_ms !== null ? now_ms : Date.now();
  
  // FAIL-SAFE: If no state, BLOCK
  if (!state || !(state instanceof RiskGovernorState)) {
    const reason = 'FAIL-SAFE: Risk governor state not initialized';
    
    // Log block event
    if (eventLog) {
      eventLog.risk('order_blocked', {
        reason,
        signal_id: signal.id || 'unknown'
      }, currentTime);
    }
    
    return {
      pass: false,
      reason,
      caps: {}
    };
  }
  
  // Check kill switch
  if (state.kill_switch_active) {
    const reason = `KILL SWITCH ACTIVE: ${state.kill_switch_reason}`;
    
    // Log block event
    if (eventLog) {
      eventLog.risk('order_blocked', {
        reason,
        kill_switch: true,
        kill_switch_reason: state.kill_switch_reason
      }, currentTime);
    }
    
    return {
      pass: false,
      reason,
      caps: {}
    };
  }
  
  // Check circuit breaker cooldown
  if (state.circuit_breaker_until && currentTime < state.circuit_breaker_until) {
    const remainingMinutes = Math.ceil((state.circuit_breaker_until - currentTime) / 60000);
    const reason = `Circuit breaker cooling down (${remainingMinutes}min remaining)`;
    
    // Log block event
    if (eventLog) {
      eventLog.risk('order_blocked', {
        reason,
        circuit_breaker: true,
        remaining_minutes: remainingMinutes
      }, currentTime);
    }
    
    return {
      pass: false,
      reason,
      caps: {}
    };
  }
  
  // Get caps (with hardcoded fallbacks)
  const maxPositionSizeUsd = config.max_position_size_usd || 1000;
  const maxDailyLossUsd = config.max_daily_loss_usd || 100;
  const maxDrawdownPct = config.max_drawdown_from_peak_pct || 0.05;
  const killSwitchThreshold = config.kill_switch_threshold || 0.10;
  
  // Signal position size
  const signalSize = Math.abs(signal.size_usd || 0);
  
  // CRITICAL: Check kill switch threshold FIRST (before all other checks)
  const currentDD = state.getCurrentDrawdown();
  if (currentDD >= killSwitchThreshold) {
    // ACTIVATE KILL SWITCH
    state.kill_switch_active = true;
    state.kill_switch_reason = `Drawdown ${(currentDD * 100).toFixed(2)}% exceeded kill switch threshold ${(killSwitchThreshold * 100).toFixed(0)}%`;
    
    return {
      pass: false,
      reason: state.kill_switch_reason,
      caps: { kill_switch_threshold: killSwitchThreshold }
    };
  }
  
  // Check 1: Position size cap
  if (signalSize > maxPositionSizeUsd) {
    return {
      pass: false,
      reason: `Position size $${signalSize.toFixed(0)} exceeds cap $${maxPositionSizeUsd.toFixed(0)}`,
      caps: { max_position_size_usd: maxPositionSizeUsd }
    };
  }
  
  // Check 2: Daily loss cap
  if (state.daily_pnl < -maxDailyLossUsd) {
    return {
      pass: false,
      reason: `Daily loss $${Math.abs(state.daily_pnl).toFixed(2)} exceeds cap $${maxDailyLossUsd.toFixed(0)}`,
      caps: { max_daily_loss_usd: maxDailyLossUsd }
    };
  }
  
  // Check 3: Drawdown from peak
  if (currentDD > maxDrawdownPct) {
    return {
      pass: false,
      reason: `Drawdown ${(currentDD * 100).toFixed(2)}% exceeds cap ${(maxDrawdownPct * 100).toFixed(0)}%`,
      caps: { max_drawdown_from_peak_pct: maxDrawdownPct }
    };
  }
  
  // All checks passed
  return {
    pass: true,
    reason: 'Risk checks passed',
    caps: {
      max_position_size_usd: maxPositionSizeUsd,
      max_daily_loss_usd: maxDailyLossUsd,
      max_drawdown_from_peak_pct: maxDrawdownPct,
      current_drawdown_pct: currentDD,
      daily_pnl: state.daily_pnl,
      remaining_daily_loss_budget: maxDailyLossUsd + state.daily_pnl
    }
  };
}

/**
 * Post-check: Update state after trade execution
 * @param {Object} trade - Executed trade result
 * @param {RiskGovernorState} state - Current risk state
 * @param {Object} ssot - SSOT configuration
 * @param {number} now_ms - Current timestamp (for determinism)
 * @param {Object} eventLog - Optional EventLog instance for observability
 * @returns {Object} {updated: boolean, circuit_breaker_activated: boolean}
 */
export function update(trade, state, ssot, now_ms = null, eventLog = null) {
  const config = ssot.risk_governor || {};
  const currentTime = now_ms !== null ? now_ms : Date.now();
  
  // FAIL-SAFE: If no state, do nothing
  if (!state || !(state instanceof RiskGovernorState)) {
    return { updated: false, circuit_breaker_activated: false };
  }
  
  // Update daily PnL
  const tradePnL = trade.pnl || 0;
  state.daily_pnl += tradePnL;
  state.daily_trade_count += 1;
  
  // Update equity
  state.updateEquity((state.current_equity || 10000) + tradePnL);
  
  // Record trade
  state.trade_history.push({
    timestamp: currentTime,
    pnl: tradePnL,
    equity: state.current_equity,
    drawdown: state.getCurrentDrawdown()
  });
  
  // Log state update
  if (eventLog) {
    eventLog.risk('state_update', {
      equity: state.current_equity,
      peak_equity: state.peak_equity,
      drawdown: state.getCurrentDrawdown(),
      daily_pnl: state.daily_pnl,
      daily_trade_count: state.daily_trade_count
    }, currentTime);
  }
  
  // Check if circuit breaker should activate
  const maxDailyLossUsd = config.max_daily_loss_usd || 100;
  const circuitBreakerCooldownMinutes = config.circuit_breaker_cooldown_minutes || 60;
  
  let circuitBreakerActivated = false;
  
  // Activate circuit breaker if daily loss cap hit
  if (state.daily_pnl < -maxDailyLossUsd) {
    state.circuit_breaker_until = currentTime + (circuitBreakerCooldownMinutes * 60000);
    circuitBreakerActivated = true;
    
    // Log circuit breaker activation
    if (eventLog) {
      eventLog.sys('circuit_breaker_activated', {
        daily_pnl: state.daily_pnl,
        max_daily_loss: maxDailyLossUsd,
        cooldown_minutes: circuitBreakerCooldownMinutes,
        cooldown_until: state.circuit_breaker_until
      }, currentTime);
    }
  }
  
  return {
    updated: true,
    circuit_breaker_activated: circuitBreakerActivated,
    current_drawdown: state.getCurrentDrawdown(),
    daily_pnl: state.daily_pnl
  };
}

/**
 * Manual kill switch activation (for operator control)
 * @param {RiskGovernorState} state - Current risk state
 * @param {string} reason - Reason for activation
 * @param {Object} eventLog - Optional EventLog instance
 * @param {number} now_ms - Current timestamp (for determinism)
 */
export function activateKillSwitch(state, reason, eventLog = null, now_ms = null) {
  if (!state || !(state instanceof RiskGovernorState)) {
    return { activated: false, reason: 'Invalid state' };
  }
  
  const currentTime = now_ms !== null ? now_ms : Date.now();
  
  state.kill_switch_active = true;
  state.kill_switch_reason = reason || 'Manual activation';
  
  // Log kill switch activation
  if (eventLog) {
    eventLog.sys('kill_switch_activated', {
      reason: state.kill_switch_reason
    }, currentTime);
  }
  
  return {
    activated: true,
    reason: state.kill_switch_reason
  };
}

/**
 * Deactivate kill switch (requires manual intervention)
 * @param {RiskGovernorState} state - Current risk state
 * @param {Object} eventLog - Optional EventLog instance
 * @param {number} now_ms - Current timestamp (for determinism)
 */
export function deactivateKillSwitch(state, eventLog = null, now_ms = null) {
  if (!state || !(state instanceof RiskGovernorState)) {
    return { deactivated: false, reason: 'Invalid state' };
  }
  
  const currentTime = now_ms !== null ? now_ms : Date.now();
  
  state.kill_switch_active = false;
  state.kill_switch_reason = null;
  
  // Log kill switch deactivation
  if (eventLog) {
    eventLog.sys('kill_switch_deactivated', {}, currentTime);
  }
  
  return {
    deactivated: true
  };
}

/**
 * Get risk dashboard metrics
 * @param {RiskGovernorState} state - Current risk state
 * @param {Object} ssot - SSOT configuration
 * @param {number} now_ms - Current timestamp (for determinism)
 * @returns {Object} Dashboard metrics
 */
export function getDashboard(state, ssot, now_ms = null) {
  const config = ssot.risk_governor || {};
  const currentTime = now_ms !== null ? now_ms : Date.now();
  
  if (!state || !(state instanceof RiskGovernorState)) {
    return {
      status: 'ERROR',
      reason: 'Invalid state'
    };
  }
  
  const maxPositionSizeUsd = config.max_position_size_usd || 1000;
  const maxDailyLossUsd = config.max_daily_loss_usd || 100;
  const maxDrawdownPct = config.max_drawdown_from_peak_pct || 0.05;
  const killSwitchThreshold = config.kill_switch_threshold || 0.10;
  
  const currentDD = state.getCurrentDrawdown();
  
  return {
    status: state.kill_switch_active ? 'KILL_SWITCH_ACTIVE' : 
            state.circuit_breaker_until && currentTime < state.circuit_breaker_until ? 'CIRCUIT_BREAKER' : 
            'ACTIVE',
    kill_switch_reason: state.kill_switch_reason,
    current_equity: state.current_equity,
    peak_equity: state.peak_equity,
    current_drawdown_pct: currentDD,
    daily_pnl: state.daily_pnl,
    daily_trade_count: state.daily_trade_count,
    caps: {
      max_position_size_usd: maxPositionSizeUsd,
      max_daily_loss_usd: maxDailyLossUsd,
      max_drawdown_pct: maxDrawdownPct,
      kill_switch_threshold: killSwitchThreshold,
      remaining_daily_loss_budget: maxDailyLossUsd + state.daily_pnl
    },
    warnings: [
      currentDD > maxDrawdownPct ? `⚠️  Drawdown ${(currentDD * 100).toFixed(2)}% exceeds cap` : null,
      state.daily_pnl < -maxDailyLossUsd ? `⚠️  Daily loss exceeded` : null,
      currentDD > killSwitchThreshold * 0.8 ? `⚠️  Approaching kill switch threshold` : null
    ].filter(Boolean)
  };
}
