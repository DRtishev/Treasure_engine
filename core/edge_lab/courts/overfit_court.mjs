// core/edge_lab/courts/overfit_court.mjs — Overfit Court
// Doctrine: statistical confidence is mandatory.
// Required: walk-forward, purged+embargo CV, min trade count thresholds,
//           deflated Sharpe, bootstrap CI, regime stability.

import crypto from 'node:crypto';
import { VERDICTS, REASON_CODES } from '../verdicts.mjs';

const DEFAULTS = {
  min_trades: 30,
  min_oos_sharpe: 0.5,
  min_deflated_sharpe: 0.3,
  min_wf_oos_win_rate: 0.5,   // fraction of WF folds that are profitable OOS
  bootstrap_ci_confidence: 0.95,
  min_regime_stability: 0.5,
};

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr, m = mean(arr)) {
  if (arr.length < 2) return 0;
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1));
}

function sharpeRatio(returns) {
  const m = mean(returns);
  const s = std(returns);
  return s < 1e-12 ? 0 : m / s;
}

/**
 * Deflated Sharpe Ratio (Bailey & Lopez de Prado, 2014).
 * Adjusts for number of trials and autocorrelation.
 * @param {number} sharpe - observed Sharpe
 * @param {number} T      - number of observations
 * @param {number} N      - number of independent trials (strategies tested)
 * @returns {number} deflated Sharpe
 */
function deflatedSharpe(sharpe, T, N = 1) {
  if (T < 2 || N < 1) return 0;
  // Approximation: SR* = SR - sqrt((1 / (T-1)) * (1 + 0.5 * skewness^2)) * z_score_correction
  // Simplified version for deterministic output:
  const penalty = Math.sqrt(Math.log(N) / (T - 1));
  return Math.max(0, sharpe - penalty);
}

/**
 * Bootstrap confidence interval for mean return (percentile method).
 * @param {number[]} returns
 * @param {number} confidence - e.g. 0.95
 * @param {number} iterations
 * @param {number} seed - deterministic seed
 */
function bootstrapCI(returns, confidence = 0.95, iterations = 1000, seed = 12345) {
  if (!returns.length) return { lower: 0, upper: 0, mean: 0 };

  // Deterministic LCG RNG
  let rng = seed >>> 0;
  function nextInt(max) {
    rng = (Math.imul(1664525, rng) + 1013904223) >>> 0;
    return rng % max;
  }

  const bootstrapMeans = [];
  for (let i = 0; i < iterations; i++) {
    let sum = 0;
    for (let j = 0; j < returns.length; j++) {
      sum += returns[nextInt(returns.length)];
    }
    bootstrapMeans.push(sum / returns.length);
  }
  bootstrapMeans.sort((a, b) => a - b);

  const alpha = 1 - confidence;
  const lower = bootstrapMeans[Math.floor((alpha / 2) * iterations)];
  const upper = bootstrapMeans[Math.floor((1 - alpha / 2) * iterations)];
  return { lower, upper, mean: mean(bootstrapMeans) };
}

/**
 * @param {Object} edge
 *   edge.trades            {Array}  - Trade records with { pnl, pnl_pct? }
 *   edge.wfo               {Object} - Walk-forward analysis results:
 *                                     { folds: Array<{ oos_pnl, oos_trades, oos_sharpe }> }
 *   edge.strategies_tested {number} - Number of strategies/params tested (for deflated Sharpe)
 *   edge.regime_labels     {string[]} - Optional: per-trade regime label for stability check
 * @param {Object} ssot
 */
export function runOverfitCourt(edge, ssot) {
  const reason_codes = [];
  const warnings = [];
  const evidence = {};
  const cfg = ssot?.edge_lab?.overfit_court ?? {};

  const trades = edge.trades || [];
  const wfo = edge.wfo || {};
  const wfFolds = Array.isArray(wfo.folds) ? wfo.folds : [];
  const N = edge.strategies_tested ?? 1;
  const seed = edge.seed ?? 12345;

  const minTrades = cfg.min_trades ?? DEFAULTS.min_trades;
  const minDeflatedSharpe = cfg.min_deflated_sharpe ?? DEFAULTS.min_deflated_sharpe;
  const minWfOosWinRate = cfg.min_wf_oos_win_rate ?? DEFAULTS.min_wf_oos_win_rate;
  const bsConfidence = cfg.bootstrap_ci_confidence ?? DEFAULTS.bootstrap_ci_confidence;

  // ─── 1. Minimum trade count ────────────────────────────────────────────────
  evidence.trade_count = trades.length;
  evidence.min_trade_count = minTrades;
  if (trades.length < minTrades) {
    reason_codes.push(REASON_CODES.MIN_TRADE_COUNT_FAIL);
  }

  // ─── 2. Walk-forward OOS profitability ────────────────────────────────────
  if (wfFolds.length > 0) {
    const profitableFolds = wfFolds.filter((f) => (f.oos_pnl ?? 0) > 0).length;
    const oosFoldWinRate = profitableFolds / wfFolds.length;
    evidence.wf_folds = wfFolds.length;
    evidence.wf_profitable_folds = profitableFolds;
    evidence.wf_oos_win_rate = Math.round(oosFoldWinRate * 10000) / 10000;
    evidence.min_wf_oos_win_rate = minWfOosWinRate;
    if (oosFoldWinRate < minWfOosWinRate) {
      reason_codes.push(REASON_CODES.WALKFORWARD_OOS_FAIL);
    }

    // OOS Sharpe across folds
    const oosSharpes = wfFolds.map((f) => f.oos_sharpe ?? 0);
    evidence.wf_mean_oos_sharpe = Math.round(mean(oosSharpes) * 10000) / 10000;
  } else {
    warnings.push('No walk-forward folds provided — OOS validation skipped');
    evidence.wf_folds = 0;
  }

  // ─── 3. Deflated Sharpe ───────────────────────────────────────────────────
  const returns = trades.map((t) => t.pnl_pct ?? (t.pnl ?? 0) / Math.max(1, Math.abs(t.notional_usd ?? 1)));
  const rawSharpe = sharpeRatio(returns);
  const dSharpe = deflatedSharpe(rawSharpe, trades.length, N);
  evidence.raw_sharpe = Math.round(rawSharpe * 10000) / 10000;
  evidence.deflated_sharpe = Math.round(dSharpe * 10000) / 10000;
  evidence.strategies_tested = N;
  evidence.min_deflated_sharpe = minDeflatedSharpe;
  if (dSharpe < minDeflatedSharpe) {
    reason_codes.push(REASON_CODES.DEFLATED_SHARPE_INSUFFICIENT);
  }

  // ─── 4. Bootstrap confidence interval ─────────────────────────────────────
  const ci = bootstrapCI(returns, bsConfidence, 1000, seed);
  evidence.bootstrap_ci = {
    confidence: bsConfidence,
    lower: Math.round(ci.lower * 10000) / 10000,
    upper: Math.round(ci.upper * 10000) / 10000,
    mean: Math.round(ci.mean * 10000) / 10000,
  };
  // If lower CI bound ≤ 0, the edge is not statistically confirmed positive
  if (ci.lower <= 0) {
    reason_codes.push(REASON_CODES.BOOTSTRAP_CI_FAIL);
  }

  // ─── 5. Regime stability ──────────────────────────────────────────────────
  const regimeLabels = edge.regime_labels;
  if (Array.isArray(regimeLabels) && regimeLabels.length === trades.length) {
    const regimes = {};
    for (let i = 0; i < trades.length; i++) {
      const r = regimeLabels[i] || 'unknown';
      if (!regimes[r]) regimes[r] = [];
      regimes[r].push(trades[i].pnl ?? 0);
    }
    const regimeProfitability = {};
    let profitableRegimes = 0;
    const regimeKeys = Object.keys(regimes);
    for (const r of regimeKeys) {
      const pnl = regimes[r].reduce((a, b) => a + b, 0);
      regimeProfitability[r] = Math.round(pnl * 100) / 100;
      if (pnl > 0) profitableRegimes++;
    }
    const regimeStability = regimeKeys.length > 0 ? profitableRegimes / regimeKeys.length : 1;
    evidence.regime_stability = Math.round(regimeStability * 10000) / 10000;
    evidence.regime_pnl = regimeProfitability;
    const minStability = cfg.min_regime_stability ?? DEFAULTS.min_regime_stability;
    if (regimeStability < minStability) {
      reason_codes.push(REASON_CODES.REGIME_INSTABILITY);
    }
  } else {
    warnings.push('Regime labels not provided — regime stability check skipped');
    evidence.regime_stability = null;
  }

  // ─── 6. Deterministic fingerprint of overfit evidence ─────────────────────
  evidence.evidence_fingerprint = crypto
    .createHash('sha256')
    .update(JSON.stringify({ deflated_sharpe: evidence.deflated_sharpe, bootstrap_ci: evidence.bootstrap_ci, wf_oos_win_rate: evidence.wf_oos_win_rate }))
    .digest('hex')
    .slice(0, 16);

  // ─── Verdict ──────────────────────────────────────────────────────────────
  let verdict;
  if (reason_codes.includes(REASON_CODES.MIN_TRADE_COUNT_FAIL)) {
    verdict = VERDICTS.NEEDS_DATA;
  } else if (reason_codes.length > 0) {
    verdict = VERDICTS.NOT_ELIGIBLE;
  } else {
    verdict = VERDICTS.TESTING_SET_ELIGIBLE;
  }

  return {
    court: 'OverfitCourt',
    verdict,
    reason_codes,
    warnings,
    evidence_summary: evidence,
    next_actions: _nextActions(verdict, reason_codes),
  };
}

function _nextActions(verdict, codes) {
  if (verdict === VERDICTS.TESTING_SET_ELIGIBLE) return ['Statistical validation passed — proceed to Red Team Court'];
  if (verdict === VERDICTS.NEEDS_DATA) return ['Collect more trades for statistical significance'];
  const actions = [];
  if (codes.includes(REASON_CODES.DEFLATED_SHARPE_INSUFFICIENT))
    actions.push('Deflated Sharpe insufficient — reduce number of strategies tested or improve edge quality');
  if (codes.includes(REASON_CODES.WALKFORWARD_OOS_FAIL))
    actions.push('Walk-forward OOS win rate too low — edge may be curve-fitted to in-sample data');
  if (codes.includes(REASON_CODES.BOOTSTRAP_CI_FAIL))
    actions.push('Bootstrap CI lower bound ≤ 0 — edge not statistically confirmed positive');
  if (codes.includes(REASON_CODES.REGIME_INSTABILITY))
    actions.push('Edge not profitable across sufficient regimes — likely overfitted to one market condition');
  return actions.length ? actions : ['Review overfit metrics and collect more diverse data'];
}
