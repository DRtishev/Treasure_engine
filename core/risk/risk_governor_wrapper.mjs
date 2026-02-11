// core/risk/risk_governor_wrapper.mjs
// EPOCH-17: thin wrapper to integrate risk governor with execution path.

import {
  RiskGovernorState,
  preCheck,
  update,
  getDashboard,
  activateKillSwitch,
  deactivateKillSwitch,
} from './risk_governor.mjs';

export class RiskGovernorWrapper {
  constructor(options = {}) {
    this.ssot = options.ssot || {};
    this.state = options.state || new RiskGovernorState(this.ssot.risk_governor || {}, options.now_ms ?? null);
    this.eventLog = options.eventLog || null;
  }

  preCheckIntent(intent, now_ms = null) {
    return preCheck(intent, this.state, this.ssot, now_ms, this.eventLog);
  }

  updateAfterTrade(trade, now_ms = null) {
    return update(trade, this.state, this.ssot, now_ms, this.eventLog);
  }

  getDashboard(now_ms = null) {
    return getDashboard(this.state, this.ssot, now_ms);
  }

  activateKillSwitch(reason, now_ms = null) {
    return activateKillSwitch(this.state, reason, now_ms, this.eventLog);
  }

  deactivateKillSwitch(now_ms = null) {
    return deactivateKillSwitch(this.state, now_ms, this.eventLog);
  }
}

export default RiskGovernorWrapper;
