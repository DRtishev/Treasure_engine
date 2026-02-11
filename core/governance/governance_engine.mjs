// core/governance/governance_engine.mjs
// EPOCH-19: governance orchestration + mode transition state.

import { ApprovalWorkflow } from './approval_workflow.mjs';
import { RulesEngine, GOV_MODES } from './rules_engine.mjs';

export class GovernanceEngine {
  constructor(options = {}) {
    this.mode = options.initial_mode || GOV_MODES.DRY_RUN;
    this.rules = options.rules || new RulesEngine();
    this.approvals = options.approvals || new ApprovalWorkflow(options);
    this.eventLog = options.eventLog || null;
    this.history = [];
    this.nowProvider = options.nowProvider || (() => Date.now());
  }

  _emit(event, payload = {}, ts_ms = null) {
    if (!this.eventLog) return;
    if (typeof this.eventLog.sys === 'function') {
      this.eventLog.sys(event, payload, ts_ms ?? undefined);
    }
  }

  requestTransition(request = {}) {
    const normalized = {
      ...request,
      from_mode: request.from_mode ?? this.mode,
      ts_ms: request.ts_ms ?? this.nowProvider(),
    };
    const decision = this.rules.evaluateTransition(normalized);
    if (normalized.from_mode !== this.mode) {
      decision.allowed = false;
      decision.blocking_reasons = [...decision.blocking_reasons, 'from_mode_state_mismatch'];
    }

    const record = {
      from_mode: normalized.from_mode,
      to_mode: normalized.to_mode,
      allowed: decision.allowed,
      blocking_reasons: decision.blocking_reasons,
      ts_ms: normalized.ts_ms,
      reason: normalized.reason || 'unspecified',
      requested_by: normalized.requested_by || 'unknown',
    };

    this.history.push(record);

    if (decision.allowed) {
      this.mode = normalized.to_mode;
      this._emit('governance_transition_allowed', record, normalized.ts_ms);
    } else {
      this._emit('governance_transition_blocked', record, normalized.ts_ms);
    }

    return {
      ...decision,
      mode: this.mode,
      record,
    };
  }

  issueApproval(payload = {}) {
    return this.approvals.issueApproval(payload);
  }

  validateApproval(approval_id, expectedScope) {
    return this.approvals.validateApproval(approval_id, expectedScope);
  }

  getState() {
    return {
      mode: this.mode,
      history_size: this.history.length,
    };
  }
}

export default GovernanceEngine;
