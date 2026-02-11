// core/governance/approval_workflow.mjs
// EPOCH-19: deterministic local approval artifact handling.

export class ApprovalWorkflow {
  constructor(options = {}) {
    this.nowProvider = options.nowProvider || (() => Date.now());
    this.approvals = new Map();
  }

  issueApproval({ approval_id, approver_id, scope, expiry_ms, reason = 'manual_approval' }) {
    if (!approval_id || !approver_id || !scope || !Number.isFinite(expiry_ms)) {
      throw new Error('approval_id, approver_id, scope, expiry_ms are required');
    }

    const artifact = {
      approval_id,
      approver_id,
      scope,
      reason,
      issued_at_ms: this.nowProvider(),
      expiry_ms,
      approved: true,
    };

    this.approvals.set(approval_id, artifact);
    return artifact;
  }

  getApproval(approval_id) {
    return this.approvals.get(approval_id) || null;
  }

  validateApproval(approval_id, expectedScope) {
    const artifact = this.getApproval(approval_id);
    if (!artifact || !artifact.approved) {
      return { allowed: false, reason: 'approval_missing_or_not_approved' };
    }
    if (artifact.scope !== expectedScope) {
      return { allowed: false, reason: 'approval_scope_mismatch' };
    }
    if (this.nowProvider() > artifact.expiry_ms) {
      return { allowed: false, reason: 'approval_expired' };
    }
    return { allowed: true, reason: 'approval_valid', artifact };
  }
}

export default ApprovalWorkflow;
