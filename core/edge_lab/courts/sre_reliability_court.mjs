// core/edge_lab/courts/sre_reliability_court.mjs — SRE Reliability Court
// Doctrine: system must behave like mission-critical infrastructure.
// Define SLIs: execution latency, fill reliability, data freshness, error rates, slippage drift.
// Define SLO thresholds. If monitoring impossible → BLOCKED.

import { VERDICTS, REASON_CODES } from '../verdicts.mjs';

const SLO_DEFAULTS = {
  max_execution_latency_p99_ms: 500,
  min_fill_reliability_pct: 95,       // % of orders successfully filled
  max_data_freshness_lag_ms: 5000,    // max acceptable data lag
  max_error_rate_pct: 1.0,            // % of operations resulting in errors
  max_slippage_drift_bps: 3,          // max drift from expected slippage
};

/**
 * @param {Object} edge
 *   edge.sre  {Object} - SRE metrics:
 *     {
 *       execution_latency_p99_ms:    number,
 *       fill_reliability_pct:         number,   [0..100]
 *       data_freshness_lag_ms:        number,
 *       error_rate_pct:               number,   [0..100]
 *       slippage_drift_bps:           number,
 *       monitoring_configured:        boolean,
 *       sli_definitions_present:      boolean,
 *     }
 * @param {Object} ssot
 */
export function runSREReliabilityCourt(edge, ssot) {
  const reason_codes = [];
  const warnings = [];
  const evidence = {};
  const sliResults = [];

  const sre = edge.sre || {};
  const cfg = ssot?.edge_lab?.sre_court ?? {};

  const sloLatency = cfg.max_execution_latency_p99_ms ?? SLO_DEFAULTS.max_execution_latency_p99_ms;
  const sloFillReliability = cfg.min_fill_reliability_pct ?? SLO_DEFAULTS.min_fill_reliability_pct;
  const sloFreshness = cfg.max_data_freshness_lag_ms ?? SLO_DEFAULTS.max_data_freshness_lag_ms;
  const sloErrorRate = cfg.max_error_rate_pct ?? SLO_DEFAULTS.max_error_rate_pct;
  const sloSlippageDrift = cfg.max_slippage_drift_bps ?? SLO_DEFAULTS.max_slippage_drift_bps;

  evidence.slo_thresholds = {
    execution_latency_p99_ms: sloLatency,
    fill_reliability_pct: sloFillReliability,
    data_freshness_lag_ms: sloFreshness,
    error_rate_pct: sloErrorRate,
    slippage_drift_bps: sloSlippageDrift,
  };

  // ─── Check: Monitoring configured ─────────────────────────────────────────
  if (!sre.monitoring_configured && sre.monitoring_configured !== undefined) {
    reason_codes.push(REASON_CODES.MONITORING_IMPOSSIBLE);
    evidence.monitoring_configured = false;
    return {
      court: 'SREReliabilityCourt',
      verdict: VERDICTS.BLOCKED,
      reason_codes,
      warnings: ['Monitoring not configured — BLOCKED by SRE doctrine'],
      evidence_summary: evidence,
      next_actions: ['Configure monitoring before resubmission — monitoring is mandatory per SRE doctrine'],
    };
  }
  evidence.monitoring_configured = sre.monitoring_configured ?? null;

  if (!sre.sli_definitions_present && sre.sli_definitions_present !== undefined) {
    warnings.push('SLI definitions not formally documented — recommended before live deployment');
  }

  // ─── SLI 1: Execution latency ─────────────────────────────────────────────
  const latency = sre.execution_latency_p99_ms ?? null;
  if (latency != null) {
    const pass = latency <= sloLatency;
    sliResults.push({ sli: 'execution_latency_p99_ms', value: latency, slo: sloLatency, pass });
    if (!pass) {
      reason_codes.push(REASON_CODES.SLO_LATENCY_BREACH);
    }
  } else {
    warnings.push('SLI execution_latency_p99_ms not provided — latency SLO not evaluated');
  }

  // ─── SLI 2: Fill reliability ──────────────────────────────────────────────
  const fillReliability = sre.fill_reliability_pct ?? null;
  if (fillReliability != null) {
    const pass = fillReliability >= sloFillReliability;
    sliResults.push({ sli: 'fill_reliability_pct', value: fillReliability, slo: sloFillReliability, pass });
    if (!pass) {
      reason_codes.push(REASON_CODES.SLO_FILL_RELIABILITY_BREACH);
    }
  } else {
    warnings.push('SLI fill_reliability_pct not provided — fill reliability SLO not evaluated');
  }

  // ─── SLI 3: Data freshness ────────────────────────────────────────────────
  const dataFreshness = sre.data_freshness_lag_ms ?? null;
  if (dataFreshness != null) {
    const pass = dataFreshness <= sloFreshness;
    sliResults.push({ sli: 'data_freshness_lag_ms', value: dataFreshness, slo: sloFreshness, pass });
    if (!pass) {
      reason_codes.push(REASON_CODES.SLO_DATA_FRESHNESS_BREACH);
    }
  } else {
    warnings.push('SLI data_freshness_lag_ms not provided — data freshness SLO not evaluated');
  }

  // ─── SLI 4: Error rate ────────────────────────────────────────────────────
  const errorRate = sre.error_rate_pct ?? null;
  if (errorRate != null) {
    const pass = errorRate <= sloErrorRate;
    sliResults.push({ sli: 'error_rate_pct', value: errorRate, slo: sloErrorRate, pass });
    if (!pass) {
      warnings.push(`Error rate ${errorRate}% exceeds SLO ${sloErrorRate}%`);
    }
  }

  // ─── SLI 5: Slippage drift ────────────────────────────────────────────────
  const slippageDrift = sre.slippage_drift_bps ?? null;
  if (slippageDrift != null) {
    const pass = slippageDrift <= sloSlippageDrift;
    sliResults.push({ sli: 'slippage_drift_bps', value: slippageDrift, slo: sloSlippageDrift, pass });
    if (!pass) {
      warnings.push(`Slippage drift ${slippageDrift}bps exceeds SLO ${sloSlippageDrift}bps — execution model drifting`);
    }
  }

  evidence.sli_results = sliResults;
  evidence.sli_pass_count = sliResults.filter((r) => r.pass).length;
  evidence.sli_fail_count = sliResults.filter((r) => !r.pass).length;

  // ─── Verdict ──────────────────────────────────────────────────────────────
  let verdict;
  if (reason_codes.includes(REASON_CODES.MONITORING_IMPOSSIBLE)) {
    verdict = VERDICTS.BLOCKED;
  } else if (reason_codes.length > 0) {
    verdict = VERDICTS.NOT_ELIGIBLE;
  } else {
    // All SLOs met (or not applicable)
    verdict = VERDICTS.LIVE_ELIGIBLE;
  }

  return {
    court: 'SREReliabilityCourt',
    verdict,
    reason_codes,
    warnings,
    evidence_summary: evidence,
    next_actions: _nextActions(verdict, reason_codes),
  };
}

function _nextActions(verdict, codes) {
  if (verdict === VERDICTS.LIVE_ELIGIBLE)
    return ['All SLOs met — edge is LIVE_ELIGIBLE pending final sign-off'];
  if (codes.includes(REASON_CODES.MONITORING_IMPOSSIBLE))
    return ['Configure monitoring infrastructure before any live deployment'];
  const actions = [];
  if (codes.includes(REASON_CODES.SLO_LATENCY_BREACH))
    actions.push('Reduce execution latency: co-location, order routing optimization, or strategy frequency adjustment');
  if (codes.includes(REASON_CODES.SLO_FILL_RELIABILITY_BREACH))
    actions.push('Improve fill reliability: use liquidity-taking orders or venue selection');
  if (codes.includes(REASON_CODES.SLO_DATA_FRESHNESS_BREACH))
    actions.push('Reduce data pipeline latency or add freshness alerting');
  return actions.length ? actions : ['Review SLI/SLO results and address breaches'];
}
