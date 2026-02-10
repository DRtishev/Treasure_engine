#!/usr/bin/env node
// core/truth/truth_engine.mjs
// EPOCH-06: AUTHORITATIVE TRUTH LAYER
// Single source of truth for trading decisions
// Hierarchy: Safety > Truth > Profit

/**
 * Reason codes (stable, machine-readable)
 */
export const REASON_CODES = {
  // HALT reasons
  HALT_REALITY_GAP: 'HALT_REALITY_GAP',
  HALT_KILL_SWITCH_ACTIVE: 'HALT_KILL_SWITCH_ACTIVE',
  HALT_MAX_DRAWDOWN: 'HALT_MAX_DRAWDOWN',
  HALT_DAILY_LOSS: 'HALT_DAILY_LOSS',
  HALT_DATA_STALE: 'HALT_DATA_STALE',
  HALT_EMERGENCY_STOP: 'HALT_EMERGENCY_STOP',
  
  // DEGRADED reasons
  DEGRADED_PERF_P99: 'DEGRADED_PERF_P99',
  DEGRADED_HIGH_REJECT: 'DEGRADED_HIGH_REJECT',
  DEGRADED_HIGH_SLIPPAGE: 'DEGRADED_HIGH_SLIPPAGE',
  DEGRADED_LOW_CONFIDENCE: 'DEGRADED_LOW_CONFIDENCE',
  
  // ALLOW reasons
  ALLOW_OK: 'ALLOW_OK'
};

/**
 * Verdicts (authoritative decisions)
 */
export const VERDICTS = {
  ALLOW: 'ALLOW',
  DEGRADED: 'DEGRADED',
  HALT: 'HALT'
};

/**
 * Modes (operational states)
 */
export const MODES = {
  OFF: 'OFF',
  PAPER: 'PAPER',
  LIVE_SMALL: 'LIVE_SMALL',
  LIVE: 'LIVE',
  DIAGNOSTIC: 'DIAGNOSTIC'
};

/**
 * Truth Engine - Authoritative judge for trading decisions
 * 
 * CRITICAL PRINCIPLES:
 * 1. Deterministic: same input → same output
 * 2. Safety > Truth > Profit
 * 3. HALT is terminal (no self-heal override)
 * 4. All decisions are reason_codes (machine-readable)
 */
export class TruthEngine {
  constructor(ssot) {
    this.ssot = ssot;
    
    // Extract truth_layer config from SSOT
    this.config = ssot.truth_layer || {
      reality_gap_halt: 0.85,
      penalized_expectancy_min: 0.0,
      max_drawdown_halt_pct: 0.20,
      max_daily_loss_halt_usd: 200,
      data_staleness_halt_ms: 5000,
      min_confidence_allow: 0.75,
      cooldown_on_degraded_s: 300,
      reduce_risk_on_degraded_pct: 50
    };
  }

  /**
   * Evaluate system state and return authoritative verdict
   * 
   * @param {Object} systemState - Current system state
   * @returns {Object} truthVerdict - Authoritative decision
   */
  evaluate(systemState) {
    const timestamp = Date.now();
    
    // Initialize verdict structure
    const verdict = {
      verdict: VERDICTS.ALLOW,
      mode: MODES.PAPER,
      reason_codes: [],
      confidence: 1.0,
      actions: {
        kill_switch: false,
        reduce_risk_pct: 0,
        cooldown_s: 0
      },
      limits_snapshot: {
        reality_gap_halt: this.config.reality_gap_halt,
        max_drawdown_halt_pct: this.config.max_drawdown_halt_pct,
        max_daily_loss_halt_usd: this.config.max_daily_loss_halt_usd,
        data_staleness_halt_ms: this.config.data_staleness_halt_ms,
        min_confidence_allow: this.config.min_confidence_allow
      },
      timestamp
    };

    // GATE 0: Check kill switch (highest priority)
    if (systemState.kill_switch === true) {
      verdict.verdict = VERDICTS.HALT;
      verdict.mode = MODES.OFF;
      verdict.reason_codes.push(REASON_CODES.HALT_KILL_SWITCH_ACTIVE);
      verdict.actions.kill_switch = true;
      verdict.confidence = 0.0;
      return verdict;
    }

    // GATE 1: Check emergency stop
    if (systemState.emergency_stop === true) {
      verdict.verdict = VERDICTS.HALT;
      verdict.mode = MODES.OFF;
      verdict.reason_codes.push(REASON_CODES.HALT_EMERGENCY_STOP);
      verdict.actions.kill_switch = true;
      verdict.confidence = 0.0;
      return verdict;
    }

    // GATE 2: Check reality gap (data quality)
    if (systemState.reality_gap !== undefined && 
        systemState.reality_gap > this.config.reality_gap_halt) {
      verdict.verdict = VERDICTS.HALT;
      verdict.mode = MODES.OFF;
      verdict.reason_codes.push(REASON_CODES.HALT_REALITY_GAP);
      verdict.actions.kill_switch = true;
      verdict.confidence = 0.0;
      return verdict;
    }

    // GATE 3: Check data staleness
    if (systemState.last_data_timestamp !== undefined) {
      const staleness = timestamp - systemState.last_data_timestamp;
      if (staleness > this.config.data_staleness_halt_ms) {
        verdict.verdict = VERDICTS.HALT;
        verdict.mode = MODES.OFF;
        verdict.reason_codes.push(REASON_CODES.HALT_DATA_STALE);
        verdict.actions.kill_switch = true;
        verdict.confidence = 0.0;
        return verdict;
      }
    }

    // GATE 4: Check max drawdown
    if (systemState.current_drawdown_pct !== undefined &&
        systemState.current_drawdown_pct > this.config.max_drawdown_halt_pct) {
      verdict.verdict = VERDICTS.HALT;
      verdict.mode = MODES.OFF;
      verdict.reason_codes.push(REASON_CODES.HALT_MAX_DRAWDOWN);
      verdict.actions.kill_switch = true;
      verdict.confidence = 0.0;
      return verdict;
    }

    // GATE 5: Check daily loss
    if (systemState.daily_loss_usd !== undefined &&
        Math.abs(systemState.daily_loss_usd) > this.config.max_daily_loss_halt_usd) {
      verdict.verdict = VERDICTS.HALT;
      verdict.mode = MODES.OFF;
      verdict.reason_codes.push(REASON_CODES.HALT_DAILY_LOSS);
      verdict.actions.kill_switch = true;
      verdict.confidence = 0.0;
      return verdict;
    }

    // GATE 6: Check degraded conditions
    const degradedReasons = this._checkDegradedConditions(systemState);
    
    if (degradedReasons.length > 0) {
      verdict.verdict = VERDICTS.DEGRADED;
      verdict.mode = this._selectDegradedMode(systemState);
      verdict.reason_codes.push(...degradedReasons);
      verdict.actions.reduce_risk_pct = this.config.reduce_risk_on_degraded_pct;
      verdict.actions.cooldown_s = this.config.cooldown_on_degraded_s;
      verdict.confidence = this._calculateConfidence(systemState, degradedReasons);
      return verdict;
    }

    // GATE 7: All checks passed - ALLOW
    verdict.verdict = VERDICTS.ALLOW;
    verdict.mode = this._selectAllowMode(systemState);
    verdict.reason_codes.push(REASON_CODES.ALLOW_OK);
    verdict.confidence = this._calculateConfidence(systemState, []);
    
    return verdict;
  }

  /**
   * Check for degraded conditions (non-terminal)
   * @private
   */
  _checkDegradedConditions(systemState) {
    const reasons = [];

    // Check performance P99
    if (systemState.perf_p99_ms !== undefined && systemState.perf_p99_ms > 1000) {
      reasons.push(REASON_CODES.DEGRADED_PERF_P99);
    }

    // Check rejection rate
    if (systemState.rejection_rate !== undefined && systemState.rejection_rate > 0.3) {
      reasons.push(REASON_CODES.DEGRADED_HIGH_REJECT);
    }

    // Check slippage
    if (systemState.avg_slippage_bps !== undefined && systemState.avg_slippage_bps > 50) {
      reasons.push(REASON_CODES.DEGRADED_HIGH_SLIPPAGE);
    }

    // Check confidence
    if (systemState.system_confidence !== undefined &&
        systemState.system_confidence < this.config.min_confidence_allow) {
      reasons.push(REASON_CODES.DEGRADED_LOW_CONFIDENCE);
    }

    return reasons;
  }

  /**
   * Select mode for DEGRADED verdict
   * @private
   */
  _selectDegradedMode(systemState) {
    // Degraded always goes to PAPER or LIVE_SMALL
    if (systemState.current_mode === MODES.LIVE) {
      return MODES.LIVE_SMALL;
    }
    return MODES.PAPER;
  }

  /**
   * Select mode for ALLOW verdict
   * @private
   */
  _selectAllowMode(systemState) {
    // Use requested mode from system state if available
    if (systemState.requested_mode) {
      return systemState.requested_mode;
    }
    
    // Default to PAPER
    return MODES.PAPER;
  }

  /**
   * Calculate confidence score (rule-based, not ML)
   * @private
   */
  _calculateConfidence(systemState, degradedReasons) {
    let confidence = 1.0;

    // Reduce confidence for degraded conditions
    confidence -= degradedReasons.length * 0.15;

    // Reduce confidence for reality gap
    if (systemState.reality_gap !== undefined) {
      confidence -= systemState.reality_gap * 0.3;
    }

    // Reduce confidence for high rejection rate
    if (systemState.rejection_rate !== undefined) {
      confidence -= systemState.rejection_rate * 0.2;
    }

    // Use system confidence if available
    if (systemState.system_confidence !== undefined) {
      confidence = Math.min(confidence, systemState.system_confidence);
    }

    // Clamp to [0, 1]
    return Math.max(0.0, Math.min(1.0, confidence));
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }
}

export default TruthEngine;
