#!/usr/bin/env node
// core/governance/mode_fsm.mjs
// EPOCH-06: Governance FSM - Mode Transition State Machine
// CRITICAL: HALTED is terminal (requires manual reset)

import { MODES, VERDICTS } from '../truth/truth_engine.mjs';

/**
 * State transitions (FSM rules)
 */
const TRANSITIONS = {
  // FROM OFF
  [MODES.OFF]: {
    [MODES.PAPER]: true,
    [MODES.DIAGNOSTIC]: true
  },
  
  // FROM PAPER
  [MODES.PAPER]: {
    [MODES.OFF]: true,
    [MODES.LIVE_SMALL]: true,
    [MODES.DIAGNOSTIC]: true
  },
  
  // FROM LIVE_SMALL
  [MODES.LIVE_SMALL]: {
    [MODES.OFF]: true,
    [MODES.PAPER]: true,
    [MODES.LIVE]: true,
    [MODES.DIAGNOSTIC]: true
  },
  
  // FROM LIVE
  [MODES.LIVE]: {
    [MODES.OFF]: true,
    [MODES.PAPER]: true,
    [MODES.LIVE_SMALL]: true,
    [MODES.DIAGNOSTIC]: true
  },
  
  // FROM DIAGNOSTIC
  [MODES.DIAGNOSTIC]: {
    [MODES.OFF]: true,
    [MODES.PAPER]: true
  }
};

/**
 * Governance FSM - State machine for operational mode transitions
 * 
 * CRITICAL RULES:
 * 1. HALTED is NOT a mode - it's enforced by Truth Engine verdict
 * 2. When verdict is HALT, FSM transitions to OFF
 * 3. Manual reset required to exit HALT verdict
 * 4. Only valid transitions allowed
 * 5. Self-healing CANNOT override HALT verdict
 */
export class GovernanceFSM {
  constructor(initialMode = MODES.OFF) {
    this.currentMode = initialMode;
    this.previousMode = null;
    this.transitionHistory = [];
    this.haltActive = false;
    this.haltReason = null;
    
    // Manual reset flag (must be explicitly set)
    this.manualResetRequested = false;
  }

  /**
   * Attempt transition to new mode
   * 
   * @param {string} newMode - Target mode
   * @param {Object} truthVerdict - Current truth verdict
   * @returns {Object} - Transition result
   */
  transition(newMode, truthVerdict) {
    const timestamp = Date.now();
    
    // CRITICAL: Check if HALT verdict is active
    if (truthVerdict.verdict === VERDICTS.HALT) {
      this.haltActive = true;
      this.haltReason = truthVerdict.reason_codes.join(', ');
      
      // Force transition to OFF
      const result = this._executeTransition(MODES.OFF, {
        forced: true,
        reason: 'HALT verdict active',
        verdict: truthVerdict,
        timestamp
      });
      
      return result;
    }

    // CRITICAL: If halt was active, require manual reset
    if (this.haltActive && !this.manualResetRequested) {
      return {
        success: false,
        from: this.currentMode,
        to: newMode,
        reason: 'HALT active - manual reset required',
        haltReason: this.haltReason,
        manualResetRequired: true,
        timestamp
      };
    }

    // If manual reset requested and halt cleared, proceed
    if (this.manualResetRequested && truthVerdict.verdict !== VERDICTS.HALT) {
      this.haltActive = false;
      this.haltReason = null;
      this.manualResetRequested = false;
    }

    // Check if transition is valid
    const isValid = this._isValidTransition(this.currentMode, newMode);
    
    if (!isValid) {
      return {
        success: false,
        from: this.currentMode,
        to: newMode,
        reason: 'Invalid transition',
        validTransitions: Object.keys(TRANSITIONS[this.currentMode] || {}),
        timestamp
      };
    }

    // Check if verdict allows this mode
    if (truthVerdict.mode !== newMode && truthVerdict.verdict === VERDICTS.ALLOW) {
      // Truth Engine suggests different mode
      return {
        success: false,
        from: this.currentMode,
        to: newMode,
        reason: 'Truth Engine recommends different mode',
        suggestedMode: truthVerdict.mode,
        timestamp
      };
    }

    // Execute transition
    return this._executeTransition(newMode, {
      verdict: truthVerdict,
      timestamp
    });
  }

  /**
   * Request manual reset (to exit HALT)
   */
  requestManualReset() {
    this.manualResetRequested = true;
    return {
      success: true,
      message: 'Manual reset requested - next transition will clear HALT',
      timestamp: Date.now()
    };
  }

  /**
   * Check if transition is valid per FSM rules
   * @private
   */
  _isValidTransition(from, to) {
    if (!TRANSITIONS[from]) {
      return false;
    }
    return TRANSITIONS[from][to] === true;
  }

  /**
   * Execute transition (internal)
   * @private
   */
  _executeTransition(newMode, context) {
    const from = this.currentMode;
    
    // Update state
    this.previousMode = this.currentMode;
    this.currentMode = newMode;
    
    // Record in history
    const transition = {
      from,
      to: newMode,
      timestamp: context.timestamp,
      forced: context.forced || false,
      reason: context.reason || 'Normal transition',
      verdict: context.verdict ? context.verdict.verdict : null
    };
    
    this.transitionHistory.push(transition);
    
    // Keep only last 100 transitions
    if (this.transitionHistory.length > 100) {
      this.transitionHistory.shift();
    }
    
    return {
      success: true,
      from,
      to: newMode,
      transition,
      currentState: this.getState()
    };
  }

  /**
   * Get current FSM state
   */
  getState() {
    return {
      currentMode: this.currentMode,
      previousMode: this.previousMode,
      haltActive: this.haltActive,
      haltReason: this.haltReason,
      manualResetRequested: this.manualResetRequested,
      transitionCount: this.transitionHistory.length,
      validTransitions: Object.keys(TRANSITIONS[this.currentMode] || {})
    };
  }

  /**
   * Get transition history
   */
  getHistory(limit = 10) {
    return this.transitionHistory.slice(-limit);
  }

  /**
   * Reset FSM to initial state
   */
  reset() {
    this.currentMode = MODES.OFF;
    this.previousMode = null;
    this.haltActive = false;
    this.haltReason = null;
    this.manualResetRequested = false;
    this.transitionHistory = [];
    
    return {
      success: true,
      message: 'FSM reset to initial state',
      currentMode: this.currentMode,
      timestamp: Date.now()
    };
  }
}

export default GovernanceFSM;
