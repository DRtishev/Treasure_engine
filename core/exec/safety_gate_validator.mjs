// core/exec/safety_gate_validator.mjs
// EPOCH-17: Orchestrator around existing safety gate primitives.

import {
  validateIntent,
  checkPositionCap,
  checkDailyLossCap,
  requireConfirmation,
  validateEnvironment,
  auditLog,
} from './adapters/safety_gates.mjs';

export class SafetyGateValidator {
  constructor(config = {}) {
    this.config = {
      mode: config.mode || 'DRY_RUN',
      maxPositionSizeUsd: config.maxPositionSizeUsd ?? 1000,
      maxDailyLossUsd: config.maxDailyLossUsd ?? 100,
      confirmationRequired: config.confirmationRequired ?? true,
      ...config,
    };
  }

  validate(intent, context = {}, state = {}, eventLog = null) {
    const result = {
      pass: false,
      reason: null,
      checks: [],
      mode: this.config.mode,
    };

    try {
      // Gate 1: intent sanity
      validateIntent(intent);
      result.checks.push('validateIntent');

      // Gate 2: environment for live
      const isLive = this.config.mode === 'LIVE_PRODUCTION';
      if (isLive) {
        validateEnvironment(this.config.apiKey, this.config.apiSecret);
        result.checks.push('validateEnvironment');
      }

      // Gate 3: position cap
      const currentPosition = Number.isFinite(state.currentPositionUsd)
        ? state.currentPositionUsd
        : 0;
      const orderSizeUsd = Number.isFinite(intent.size_usd)
        ? intent.size_usd
        : intent.size * intent.price;
      checkPositionCap(currentPosition, orderSizeUsd, this.config.maxPositionSizeUsd);
      result.checks.push('checkPositionCap');

      // Gate 4: daily loss cap
      const dailyPnl = Number.isFinite(state.dailyPnlUsd) ? state.dailyPnlUsd : 0;
      checkDailyLossCap(dailyPnl, this.config.maxDailyLossUsd);
      result.checks.push('checkDailyLossCap');

      // Gate 5: explicit live confirmation
      const confirmationGiven = Boolean(context.confirmationGiven);
      requireConfirmation(isLive && this.config.confirmationRequired, confirmationGiven);
      result.checks.push('requireConfirmation');

      // Gate 6: audit logging for live
      if (isLive) {
        auditLog(intent, context, eventLog);
        result.checks.push('auditLog');
      }

      result.pass = true;
      result.reason = 'OK';
      return result;
    } catch (err) {
      result.pass = false;
      result.reason = err.message;
      return result;
    }
  }
}
