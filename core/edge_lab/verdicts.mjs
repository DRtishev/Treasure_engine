// core/edge_lab/verdicts.mjs — EDGE LAB verdict semantics
// Doctrine: never conflate verdict levels. Each means exactly one thing.

/**
 * Verdict levels (strictly ordered):
 *   PIPELINE_ELIGIBLE  — infrastructure integrity confirmed; edge may proceed to paper
 *   TESTING_SET_ELIGIBLE — hypotheses allowed to paper trade
 *   LIVE_ELIGIBLE       — proven under execution reality + reliability constraints
 *   NOT_ELIGIBLE        — failed one or more courts; edge rejected
 *   NEEDS_DATA          — insufficient evidence to decide; collect more data
 *   BLOCKED             — process error, contract drift, or determinism failure
 */

export const VERDICTS = Object.freeze({
  PIPELINE_ELIGIBLE: 'PIPELINE_ELIGIBLE',
  TESTING_SET_ELIGIBLE: 'TESTING_SET_ELIGIBLE',
  LIVE_ELIGIBLE: 'LIVE_ELIGIBLE',
  NOT_ELIGIBLE: 'NOT_ELIGIBLE',
  NEEDS_DATA: 'NEEDS_DATA',
  BLOCKED: 'BLOCKED',
});

/** Reason codes attached to verdicts */
export const REASON_CODES = Object.freeze({
  // Dataset Court
  INSUFFICIENT_TRADE_COUNT: 'INSUFFICIENT_TRADE_COUNT',
  PROXY_ASSUMPTION_UNVERIFIED: 'PROXY_ASSUMPTION_UNVERIFIED',
  DATA_STALENESS: 'DATA_STALENESS',
  DATASET_INTEGRITY_FAIL: 'DATASET_INTEGRITY_FAIL',

  // Execution Court
  REALITY_GAP_CLIFF: 'REALITY_GAP_CLIFF',
  SLIPPAGE_EXCESS: 'SLIPPAGE_EXCESS',
  FILL_RATE_LOW: 'FILL_RATE_LOW',
  LATENCY_EXCESS: 'LATENCY_EXCESS',

  // Execution Sensitivity Court
  FAILS_2X_SLIPPAGE: 'FAILS_2X_SLIPPAGE',
  SENSITIVITY_GRID_REJECTED: 'SENSITIVITY_GRID_REJECTED',

  // Risk Court
  DRAWDOWN_EXCEEDS_THRESHOLD: 'DRAWDOWN_EXCEEDS_THRESHOLD',
  TAIL_RISK_UNACCEPTABLE: 'TAIL_RISK_UNACCEPTABLE',
  KILL_SWITCH_INCOMPATIBLE: 'KILL_SWITCH_INCOMPATIBLE',
  CATASTROPHIC_LOSS_MODE: 'CATASTROPHIC_LOSS_MODE',

  // Overfit Court
  DEFLATED_SHARPE_INSUFFICIENT: 'DEFLATED_SHARPE_INSUFFICIENT',
  WALKFORWARD_OOS_FAIL: 'WALKFORWARD_OOS_FAIL',
  BOOTSTRAP_CI_FAIL: 'BOOTSTRAP_CI_FAIL',
  REGIME_INSTABILITY: 'REGIME_INSTABILITY',
  MIN_TRADE_COUNT_FAIL: 'MIN_TRADE_COUNT_FAIL',

  // Red Team Court
  STATISTICAL_VALIDITY_BROKEN: 'STATISTICAL_VALIDITY_BROKEN',
  EXECUTION_ASSUMPTION_BROKEN: 'EXECUTION_ASSUMPTION_BROKEN',
  RISK_CONTAINMENT_BROKEN: 'RISK_CONTAINMENT_BROKEN',

  // SRE Reliability Court
  SLO_LATENCY_BREACH: 'SLO_LATENCY_BREACH',
  SLO_FILL_RELIABILITY_BREACH: 'SLO_FILL_RELIABILITY_BREACH',
  SLO_DATA_FRESHNESS_BREACH: 'SLO_DATA_FRESHNESS_BREACH',
  MONITORING_IMPOSSIBLE: 'MONITORING_IMPOSSIBLE',

  // Pipeline / manifest
  CONTRACT_DRIFT: 'CONTRACT_DRIFT',
  DETERMINISM_FAILURE: 'DETERMINISM_FAILURE',
  COURT_OMISSION: 'COURT_OMISSION',
});

/** Court names in canonical execution order */
export const COURT_ORDER = Object.freeze([
  'DatasetCourt',
  'ExecutionCourt',
  'ExecutionSensitivityCourt',
  'RiskCourt',
  'OverfitCourt',
  'RedTeamCourt',
  'SREReliabilityCourt',
]);
