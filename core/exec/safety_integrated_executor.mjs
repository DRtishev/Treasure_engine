// core/exec/safety_integrated_executor.mjs
// EPOCH-17: enforce safety + risk checks before adapter execution.

import { SafetyGateValidator } from './safety_gate_validator.mjs';
import { RiskGovernorWrapper } from '../risk/risk_governor_wrapper.mjs';

export class SafetyIntegratedExecutor {
  constructor(options = {}) {
    if (!options.adapter) {
      throw new Error('adapter is required');
    }

    this.adapter = options.adapter;
    this.mode = options.mode || 'DRY_RUN';
    this.eventLog = options.eventLog || null;
    this.safetyValidator = options.safetyValidator || new SafetyGateValidator({ mode: this.mode, ...options.safetyConfig });
    this.risk = options.riskWrapper || new RiskGovernorWrapper({
      ssot: options.ssot || {},
      state: options.riskState,
      eventLog: this.eventLog,
      now_ms: options.now_ms ?? null,
    });
  }

  _emit(category, event, payload = {}, ts_ms = null) {
    if (!this.eventLog) return;

    if (typeof this.eventLog.write === 'function') {
      this.eventLog.write({
        category,
        event,
        payload,
        ts_ms: ts_ms ?? Date.now(),
      });
      return;
    }

    const lower = String(category || '').toLowerCase();
    if (typeof this.eventLog[lower] === 'function') {
      this.eventLog[lower](event, payload, ts_ms ?? undefined);
    }
  }

  async execute(intent, context = {}, runtimeState = {}) {
    const now_ms = context.now_ms ?? null;

    const safety = this.safetyValidator.validate(intent, context, runtimeState, this.eventLog);
    if (!safety.pass) {
      this._emit('RISK', 'safety_gate_blocked', {
        reason: safety.reason,
        checks: safety.checks,
      }, now_ms);
      return {
        success: false,
        blocked: true,
        stage: 'safety',
        reason: safety.reason,
        checks: safety.checks,
      };
    }

    const riskResult = this.risk.preCheckIntent(intent, now_ms);
    if (!riskResult.pass) {
      this._emit('RISK', 'risk_precheck_blocked', {
        reason: riskResult.reason,
        caps: riskResult.caps,
      }, now_ms);
      return {
        success: false,
        blocked: true,
        stage: 'risk_precheck',
        reason: riskResult.reason,
        caps: riskResult.caps,
      };
    }

    this._emit('SYS', 'safety_integrated_executor_route', {
      adapter: this.adapter.getName?.() || 'unknown',
      mode: this.mode,
    }, now_ms);

    const order = await this.adapter.placeOrder(intent, context);
    const poll = await this.adapter.pollOrder(order.order_id, context);

    this.risk.updateAfterTrade({ pnl: poll.pnl_usd ?? poll.pnl ?? 0 }, now_ms);

    const fills = poll.fills || [];
    const success = !poll.error && order.status !== 'REJECTED';

    this._emit('EXEC', 'safety_integrated_executor_result', {
      order_id: order.order_id,
      success,
      status: order.status,
      filled: !!poll.filled,
      fill_count: fills.length,
    }, now_ms);

    return {
      success,
      blocked: false,
      order_id: order.order_id,
      order,
      poll,
      risk: riskResult,
      safety,
    };
  }
}

export default SafetyIntegratedExecutor;
