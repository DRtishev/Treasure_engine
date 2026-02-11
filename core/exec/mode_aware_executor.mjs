// core/exec/mode_aware_executor.mjs
// EPOCH-19: enforce governance mode and live-intent audit before execution.

import { GOV_MODES } from '../governance/rules_engine.mjs';

export class ModeAwareExecutor {
  constructor(options = {}) {
    if (!options.executor) throw new Error('executor is required');
    if (!options.governance) throw new Error('governance is required');

    this.executor = options.executor;
    this.governance = options.governance;
    this.eventLog = options.eventLog || null;
  }

  _emit(event, payload = {}, ts_ms = null) {
    if (!this.eventLog) return;
    if (typeof this.eventLog.sys === 'function') {
      this.eventLog.sys(event, payload, ts_ms ?? undefined);
    }
  }

  async execute(intent, context = {}, runtimeState = {}) {
    const mode = this.governance.getState().mode;

    if (runtimeState.kill_switch_active) {
      return { success: false, blocked: true, reason: 'kill_switch_active' };
    }

    if (mode === GOV_MODES.DRY_RUN) {
      return this.executor.execute(intent, context, runtimeState);
    }

    if (mode === GOV_MODES.LIVE_TESTNET || mode === GOV_MODES.LIVE_PRODUCTION) {
      const risk_snapshot = context.risk_snapshot || {};
      this._emit('live_intent_logged', {
        mode,
        reason: context.reason || 'mode_aware_execution',
        risk_snapshot,
      }, context.now_ms ?? null);

      return this.executor.execute(intent, context, runtimeState);
    }

    return { success: false, blocked: true, reason: `unsupported_mode:${mode}` };
  }
}

export default ModeAwareExecutor;
