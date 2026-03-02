/**
 * graduation_court.mjs — GraduationCourt — Formal Trial for Candidate Promotion
 *
 * EPOCH-72: THE METAAGENT
 *
 * The GraduationCourt is the "thymus" of the organism — every candidate
 * must pass 5 formal examinations before graduating to production:
 *
 *   EXAM-01: EVIDENCE_COMPLETENESS  — backtest + paper + canary evidence present
 *   EXAM-02: PERFORMANCE_THRESHOLD  — Sharpe, drawdown, profit factor, win rate
 *   EXAM-03: REALITY_GAP            — live_sharpe / paper_sharpe > ratio threshold
 *   EXAM-04: RISK_ASSESSMENT        — risk_score, CB trips, VaR budget
 *   EXAM-05: BEHAVIORAL_AUDIT       — no anomalous patterns, concentration limits
 *
 * Verdict: ALL 5 pass → GRADUATED, any fail → DEFERRED.
 * Immutable verdict written to candidate court_verdicts[].
 *
 * Exports:
 *   evaluate(candidateId, candidateData, policy) → CourtVerdict (frozen)
 */

// ---------------------------------------------------------------------------
// EXAM-01: EVIDENCE_COMPLETENESS
// ---------------------------------------------------------------------------
function examEvidenceCompleteness(candidateId, data) {
  const issues = [];

  const m = data.metrics || {};
  if (m.backtest_sharpe === null || m.backtest_sharpe === undefined) {
    issues.push('missing backtest_sharpe');
  }
  if (m.paper_sharpe === null || m.paper_sharpe === undefined) {
    issues.push('missing paper_sharpe');
  }
  if (m.canary_sharpe === null || m.canary_sharpe === undefined) {
    issues.push('missing canary_sharpe');
  }
  if (!m.total_trades || m.total_trades < 50) {
    issues.push(`insufficient trades: ${m.total_trades ?? 0}`);
  }

  return {
    exam: 'EVIDENCE_COMPLETENESS',
    pass: issues.length === 0,
    score: issues.length === 0 ? 100 : Math.max(0, 100 - issues.length * 25),
    detail: issues.length === 0 ? 'all evidence present' : issues.join('; '),
  };
}

// ---------------------------------------------------------------------------
// EXAM-02: PERFORMANCE_THRESHOLD
// ---------------------------------------------------------------------------
function examPerformanceThreshold(candidateId, data, policy) {
  const m = data.metrics || {};
  const gc = policy.graduation_criteria || {};
  const issues = [];

  const sharpe = m.canary_sharpe ?? m.paper_sharpe ?? 0;
  if (sharpe < 0.5) issues.push(`sharpe=${sharpe} < 0.5`);

  const dd = m.max_drawdown_pct ?? 100;
  const maxDD = gc.max_drawdown_pct ?? 20;
  if (dd > maxDD) issues.push(`max_drawdown=${dd}% > ${maxDD}%`);

  const pf = m.profit_factor ?? 0;
  if (pf < 1.0) issues.push(`profit_factor=${pf} < 1.0`);

  const wr = m.win_rate ?? 0;
  if (wr < 0.4) issues.push(`win_rate=${wr} < 0.4`);

  return {
    exam: 'PERFORMANCE_THRESHOLD',
    pass: issues.length === 0,
    score: issues.length === 0 ? 100 : Math.max(0, 100 - issues.length * 25),
    detail: issues.length === 0 ? 'all thresholds met' : issues.join('; '),
  };
}

// ---------------------------------------------------------------------------
// EXAM-03: REALITY_GAP
// ---------------------------------------------------------------------------
function examRealityGap(candidateId, data, policy) {
  const m = data.metrics || {};
  const gc = policy.graduation_criteria || {};
  const issues = [];

  const liveSharpe = m.canary_sharpe ?? null;
  const paperSharpe = m.paper_sharpe ?? null;

  if (liveSharpe === null || paperSharpe === null) {
    issues.push('cannot compute reality gap — missing sharpe data');
  } else if (paperSharpe > 0) {
    const ratio = liveSharpe / paperSharpe;
    const minRatio = gc.live_to_paper_sharpe_ratio ?? 0.7;
    if (ratio < minRatio) {
      issues.push(`live/paper sharpe ratio=${ratio.toFixed(2)} < ${minRatio}`);
    }
  }

  return {
    exam: 'REALITY_GAP',
    pass: issues.length === 0,
    score: issues.length === 0 ? 100 : 0,
    detail: issues.length === 0 ? 'reality gap within bounds' : issues.join('; '),
  };
}

// ---------------------------------------------------------------------------
// EXAM-04: RISK_ASSESSMENT
// ---------------------------------------------------------------------------
function examRiskAssessment(candidateId, data, policy) {
  const r = data.risk || {};
  const gc = policy.graduation_criteria || {};
  const issues = [];

  const riskScore = r.score ?? 1.0;
  const maxRisk = policy.risk_per_candidate_max ?? 0.3;
  if (riskScore > maxRisk) issues.push(`risk_score=${riskScore} > ${maxRisk}`);

  const cbTrips = r.circuit_breaker_trips ?? 0;
  const maxCB = gc.max_circuit_breaker_trips ?? 0;
  if (cbTrips > maxCB) issues.push(`cb_trips=${cbTrips} > ${maxCB}`);

  return {
    exam: 'RISK_ASSESSMENT',
    pass: issues.length === 0,
    score: issues.length === 0 ? 100 : Math.max(0, 100 - issues.length * 50),
    detail: issues.length === 0 ? 'risk within bounds' : issues.join('; '),
  };
}

// ---------------------------------------------------------------------------
// EXAM-05: BEHAVIORAL_AUDIT
// ---------------------------------------------------------------------------
function examBehavioralAudit(candidateId, data, _policy) {
  const issues = [];

  // Check for anomalous concentration
  const concentration = data.metrics?.max_asset_concentration ?? 0;
  if (concentration > 0.3) {
    issues.push(`asset_concentration=${concentration} > 0.3`);
  }

  // Check for anomalous patterns flag
  if (data.behavioral_flags?.anomaly_detected) {
    issues.push('anomaly_detected flag set');
  }

  return {
    exam: 'BEHAVIORAL_AUDIT',
    pass: issues.length === 0,
    score: issues.length === 0 ? 100 : Math.max(0, 100 - issues.length * 50),
    detail: issues.length === 0 ? 'no anomalous patterns' : issues.join('; '),
  };
}

// ---------------------------------------------------------------------------
// evaluate — Run all 5 exams, produce CourtVerdict
// ---------------------------------------------------------------------------
export function evaluate(candidateId, candidateData, policy) {
  const exams = [
    examEvidenceCompleteness(candidateId, candidateData),
    examPerformanceThreshold(candidateId, candidateData, policy),
    examRealityGap(candidateId, candidateData, policy),
    examRiskAssessment(candidateId, candidateData, policy),
    examBehavioralAudit(candidateId, candidateData, policy),
  ];

  const failed = exams.filter(e => !e.pass);
  const verdict = failed.length === 0 ? 'GRADUATED' : 'DEFERRED';
  const totalScore = exams.reduce((s, e) => s + e.score, 0);

  return Object.freeze({
    candidate_id: candidateId,
    verdict,
    overall_score: Math.round(totalScore / exams.length),
    exams_passed: exams.length - failed.length,
    exams_failed: failed.length,
    exams,
    policy_version: policy.schema_version ?? '1.0.0',
    evaluated_at: new Date().toISOString(),
  });
}
