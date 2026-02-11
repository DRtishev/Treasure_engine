// core/governance/rules_engine.mjs
// EPOCH-19: declarative transition checks.

export const GOV_MODES = {
  DRY_RUN: 'DRY_RUN',
  LIVE_TESTNET: 'LIVE_TESTNET',
  LIVE_PRODUCTION: 'LIVE_PRODUCTION',
};

const ALLOWED_TRANSITIONS = {
  [GOV_MODES.DRY_RUN]: [GOV_MODES.LIVE_TESTNET],
  [GOV_MODES.LIVE_TESTNET]: [GOV_MODES.DRY_RUN, GOV_MODES.LIVE_PRODUCTION],
  [GOV_MODES.LIVE_PRODUCTION]: [GOV_MODES.DRY_RUN],
};

export class RulesEngine {
  canTransition(fromMode, toMode) {
    const next = ALLOWED_TRANSITIONS[fromMode] || [];
    return next.includes(toMode);
  }

  evaluateTransition({ from_mode, to_mode, governance_approval, risk_ready, safety_ready, manual_confirmation, reason }) {
    const blocking_reasons = [];

    if (!this.canTransition(from_mode, to_mode)) {
      blocking_reasons.push('invalid_fsm_transition');
    }

    if (to_mode === GOV_MODES.LIVE_TESTNET && !governance_approval) {
      blocking_reasons.push('missing_governance_approval');
    }

    if (to_mode === GOV_MODES.LIVE_PRODUCTION) {
      if (!governance_approval) blocking_reasons.push('missing_governance_approval');
      if (!manual_confirmation) blocking_reasons.push('missing_manual_confirmation');
    }

    if ((to_mode === GOV_MODES.LIVE_TESTNET || to_mode === GOV_MODES.LIVE_PRODUCTION) && !risk_ready) {
      blocking_reasons.push('risk_governor_not_ready');
    }

    if ((to_mode === GOV_MODES.LIVE_TESTNET || to_mode === GOV_MODES.LIVE_PRODUCTION) && !safety_ready) {
      blocking_reasons.push('safety_gates_not_ready');
    }

    if ((to_mode === GOV_MODES.LIVE_TESTNET || to_mode === GOV_MODES.LIVE_PRODUCTION) && (!reason || String(reason).trim() === '')) {
      blocking_reasons.push('missing_transition_reason');
    }

    return {
      allowed: blocking_reasons.length === 0,
      blocking_reasons,
    };
  }
}

export default RulesEngine;
