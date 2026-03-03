/**
 * candidate_fsm.mjs — CandidateFSM — Per-candidate lifecycle state machine
 *
 * EPOCH-72: THE METAAGENT
 *
 * Each trading strategy candidate has its own FSM with 8 states and 10 transitions.
 * States: DRAFT → BACKTESTED → PAPER_PROVEN → CANARY_DEPLOYED → GRADUATED
 *         PARKED, REJECTED, QUARANTINED (safety / lifecycle management)
 *
 * Guards are pure functions returning { pass, detail }.
 * Transitions produce immutable history entries with deterministic timestamps.
 * Risk fallback is fail-safe: unknown risk = 1.0 (highest risk).
 *
 * Exports:
 *   CandidateFSM        — class
 *   loadCandidateKernel  — load candidate_fsm_kernel.json
 *   CANDIDATE_GUARDS     — guard registry
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

// ---------------------------------------------------------------------------
// Load CandidateFSM kernel
// ---------------------------------------------------------------------------
export function loadCandidateKernel() {
  const kernelPath = path.join(ROOT, 'specs', 'candidate_fsm_kernel.json');
  return JSON.parse(fs.readFileSync(kernelPath, 'utf8'));
}

// ---------------------------------------------------------------------------
// Guard implementations — per-candidate lifecycle guards
// ---------------------------------------------------------------------------

function guard_backtest_pass(_candidate, _policy) {
  // Requires: backtest evidence with deterministic x2 pass
  if (!_candidate.metrics) return { pass: false, detail: 'no metrics' };
  const bt = _candidate.metrics.backtest_sharpe;
  if (bt === null || bt === undefined) return { pass: false, detail: 'no backtest_sharpe' };
  if (!(bt > 0)) return { pass: false, detail: `backtest_sharpe=${bt} <= 0` };

  // W2.2: Check Edge Lab court verdicts if present
  const verdicts = _candidate.court_verdicts ?? [];
  const edgeLabVerdict = verdicts.find(v => v.courts && v.courts.length > 0);
  if (edgeLabVerdict) {
    const blocked = ['BLOCKED', 'NOT_ELIGIBLE'];
    if (blocked.includes(edgeLabVerdict.verdict)) {
      return { pass: false, detail: `edge_lab_verdict=${edgeLabVerdict.verdict}` };
    }
  }

  // W2.2: Check determinism evidence if present
  if (_candidate.evidence?.deterministic === false) {
    return { pass: false, detail: 'determinism check failed' };
  }

  return { pass: true, detail: `backtest_sharpe=${bt}, edge_lab=${edgeLabVerdict?.verdict ?? 'N/A'}` };
}

function guard_paper_metrics(_candidate, _policy) {
  const m = _candidate.metrics || {};
  const gc = _policy.graduation_criteria || {};
  const trades = m.total_trades ?? 0;
  const sharpe = m.paper_sharpe ?? 0;
  const dd = m.max_drawdown_pct ?? 100;
  const minTrades = gc.min_canary_trades ?? 100;
  const minSharpe = gc.min_sharpe ?? 0.5;
  const maxDD = gc.max_drawdown_pct ?? 15;
  if (trades < minTrades) return { pass: false, detail: `trades=${trades} < ${minTrades}` };
  if (sharpe < minSharpe) return { pass: false, detail: `paper_sharpe=${sharpe} < ${minSharpe}` };
  if (dd > maxDD) return { pass: false, detail: `max_drawdown=${dd} > ${maxDD}%` };
  return { pass: true, detail: `trades=${trades} sharpe=${sharpe} dd=${dd}%` };
}

function guard_canary_ready(_candidate, _policy) {
  const risk = _candidate.risk?.score ?? 1.0;
  const maxRisk = _policy.risk_per_candidate_max ?? 0.3;
  if (risk > maxRisk) return { pass: false, detail: `risk_score=${risk} > ${maxRisk}` };
  return { pass: true, detail: `risk_score=${risk} <= ${maxRisk}` };
}

function guard_graduation_court(_candidate, _policy) {
  // Requires court_verdicts with at least one GRADUATED verdict
  const verdicts = _candidate.court_verdicts ?? [];
  const graduated = verdicts.find(v => v.verdict === 'GRADUATED');
  if (!graduated) return { pass: false, detail: 'no GRADUATED court verdict' };
  return { pass: true, detail: `graduated: score=${graduated.overall_score}` };
}

function guard_parkable(_candidate, _policy) {
  if (_candidate.fsm_state === 'PARKED') return { pass: false, detail: 'already PARKED' };
  if (_candidate.fsm_state === 'REJECTED') return { pass: false, detail: 'REJECTED cannot park' };
  if (_candidate.fsm_state === 'GRADUATED') return { pass: false, detail: 'GRADUATED cannot be parked' };
  return { pass: true, detail: `parkable from ${_candidate.fsm_state}` };
}

function guard_unpark(_candidate, _policy) {
  if (_candidate.fsm_state !== 'PARKED') return { pass: false, detail: `not PARKED (${_candidate.fsm_state})` };
  return { pass: true, detail: 'unparking to DRAFT' };
}

function guard_rejection_criteria(_candidate, _policy) {
  if (_candidate.fsm_state === 'REJECTED') return { pass: false, detail: 'already REJECTED' };
  // Reject on fatal risk or explicit rejection flag
  const risk = _candidate.risk?.score ?? 1.0;
  if (risk > 0.95) return { pass: true, detail: `fatal risk_score=${risk}` };
  if (_candidate.reject_flag) return { pass: true, detail: 'explicit rejection flag' };
  return { pass: false, detail: 'no rejection criteria met' };
}

function guard_quarantine_trigger(_candidate, policy) {
  if (_candidate.fsm_state === 'QUARANTINED') return { pass: false, detail: 'already QUARANTINED' };
  const risk = _candidate.risk?.score ?? 1.0;
  const threshold = policy.quarantine_triggers?.risk_score_threshold ?? 0.8;
  if (risk > threshold) return { pass: true, detail: `risk_score=${risk} > ${threshold}` };
  return { pass: false, detail: `risk_score=${risk} <= ${threshold}` };
}

function guard_quarantine_review(_candidate, _policy) {
  if (_candidate.fsm_state !== 'QUARANTINED') return { pass: false, detail: 'not QUARANTINED' };
  // Review passes if risk has decreased below threshold
  const risk = _candidate.risk?.score ?? 1.0;
  if (risk < 0.5) return { pass: true, detail: `risk_score=${risk} < 0.5 — safe to park` };
  return { pass: false, detail: `risk_score=${risk} >= 0.5 — still dangerous` };
}

function guard_quarantine_fatal(_candidate, _policy) {
  if (_candidate.fsm_state !== 'QUARANTINED') return { pass: false, detail: 'not QUARANTINED' };
  const risk = _candidate.risk?.score ?? 1.0;
  if (risk > 0.95) return { pass: true, detail: `risk_score=${risk} > 0.95 — fatal` };
  if (_candidate.reject_flag) return { pass: true, detail: 'explicit rejection during quarantine' };
  return { pass: false, detail: 'no fatal criteria during quarantine' };
}

export const CANDIDATE_GUARDS = {
  guard_backtest_pass,
  guard_paper_metrics,
  guard_canary_ready,
  guard_graduation_court,
  guard_parkable,
  guard_unpark,
  guard_rejection_criteria,
  guard_quarantine_trigger,
  guard_quarantine_review,
  guard_quarantine_fatal,
};

// ---------------------------------------------------------------------------
// CandidateFSM — per-candidate state machine
// ---------------------------------------------------------------------------
export class CandidateFSM {
  constructor(candidateData, kernel, policy, tickTs) {
    this.id = candidateData.id ?? candidateData.config_id;
    this.data = candidateData;
    this.kernel = kernel;
    this.policy = policy;
    this.tickTs = tickTs ?? 'UNKNOWN';
    this.state = candidateData.fsm_state ?? kernel.initial_state;
    this.history = [...(candidateData.fsm_history ?? [])];
  }

  /** Get current risk score */
  riskScore() {
    return this.data.risk?.score ?? 1.0;
  }

  /** Compute performance score (higher = better) */
  performanceScore() {
    const m = this.data.metrics || {};
    const sharpe = m.canary_sharpe ?? m.paper_sharpe ?? m.backtest_sharpe ?? 0;
    const dd = m.max_drawdown_pct ?? 100;
    return sharpe - (dd / 100);
  }

  /** Check if candidate can graduate (has passing court verdict) */
  canGraduate() {
    const verdicts = this.data.court_verdicts ?? [];
    return verdicts.some(v => v.verdict === 'GRADUATED');
  }

  /** Attempt a transition. Returns { success, detail, from, to } */
  transition(transitionId) {
    const tDef = this.kernel.transitions[transitionId];
    if (!tDef) return { success: false, detail: `unknown transition: ${transitionId}`, from: this.state, to: this.state };

    // Check from state
    if (tDef.from !== '*' && tDef.from !== this.state) {
      return { success: false, detail: `wrong state: ${this.state} != ${tDef.from}`, from: this.state, to: this.state };
    }

    // Check forbidden
    const forbidden = (this.kernel.forbidden_transitions ?? []).find(
      f => f.from === this.state && f.to === tDef.to
    );
    if (forbidden) {
      return { success: false, detail: `forbidden: ${forbidden.reason}`, from: this.state, to: this.state };
    }

    // Run guard
    const guardFn = CANDIDATE_GUARDS[tDef.guard];
    if (!guardFn) return { success: false, detail: `guard not found: ${tDef.guard}`, from: this.state, to: this.state };

    const guardResult = guardFn(this.data, this.policy);
    if (!guardResult.pass) {
      return { success: false, detail: `guard fail: ${guardResult.detail}`, from: this.state, to: this.state };
    }

    // Execute transition
    const from = this.state;
    this.state = tDef.to;
    this.data.fsm_state = tDef.to;

    const entry = {
      from,
      to: tDef.to,
      transition: transitionId,
      at: this.tickTs,
      guard_detail: guardResult.detail,
    };
    this.history.push(entry);

    // Cap history at 50 entries
    if (this.history.length > 50) {
      this.history = this.history.slice(-50);
    }

    this.data.fsm_history = this.history;

    return { success: true, detail: guardResult.detail, from, to: tDef.to };
  }

  /** Export serializable data */
  toJSON() {
    return {
      ...this.data,
      fsm_state: this.state,
      fsm_history: this.history,
    };
  }
}
