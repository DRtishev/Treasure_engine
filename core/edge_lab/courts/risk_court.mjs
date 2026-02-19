// core/edge_lab/courts/risk_court.mjs — Risk Court
// Doctrine: strategies must degrade gracefully. Catastrophic loss mode → REJECT.
// Verify: drawdown survivability, tail risk, correlation risk,
//         volatility regime vulnerability, kill-switch compatibility.

import { VERDICTS, REASON_CODES } from '../verdicts.mjs';

const DEFAULTS = {
  max_drawdown_pct: 0.18,
  max_tail_loss_pct: 0.25,
  max_var_95_pct: 0.05,
  max_daily_loss_usd: 200,
  min_kill_switch_compatible: true,
};

/**
 * Compute max drawdown from equity curve array.
 * @param {number[]} equity - equity curve values
 * @returns {number} max drawdown as fraction [0..1]
 */
function computeMaxDrawdown(equity) {
  if (!equity || equity.length < 2) return 0;
  let peak = equity[0];
  let maxDd = 0;
  for (const e of equity) {
    if (e > peak) peak = e;
    const dd = peak > 0 ? (peak - e) / peak : 0;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd;
}

/**
 * Estimate VaR at confidence level from returns array.
 * @param {number[]} returns - array of per-trade returns as fractions
 * @param {number} confidence - e.g. 0.95
 */
function computeVaR(returns, confidence = 0.95) {
  if (!returns || returns.length === 0) return 0;
  const sorted = [...returns].sort((a, b) => a - b);
  const idx = Math.floor((1 - confidence) * sorted.length);
  return Math.abs(sorted[Math.max(0, idx)]);
}

/**
 * Estimate tail loss (CVaR/ES) — mean of worst (1-confidence) fraction.
 * @param {number[]} returns
 * @param {number} confidence
 */
function computeExpectedShortfall(returns, confidence = 0.95) {
  if (!returns || returns.length === 0) return 0;
  const sorted = [...returns].sort((a, b) => a - b);
  const cutoff = Math.floor((1 - confidence) * sorted.length);
  const tail = sorted.slice(0, Math.max(1, cutoff));
  return Math.abs(tail.reduce((a, b) => a + b, 0) / tail.length);
}

/**
 * @param {Object} edge
 *   edge.trades        {Array}  - Trade records with { pnl, pnl_pct? }
 *   edge.equity_curve  {number[]} - Equity curve (optional; derived from trades if absent)
 *   edge.risk          {Object} - {
 *     max_daily_loss_usd: number,
 *     kill_switch_threshold_pct: number,
 *     kill_switch_compatible: boolean,
 *     correlation_with_market: number  [-1..1]
 *   }
 * @param {Object} ssot
 */
export function runRiskCourt(edge, ssot) {
  const reason_codes = [];
  const warnings = [];
  const evidence = {};

  const trades = edge.trades || [];
  const risk = edge.risk || {};
  const cfg = ssot?.edge_lab?.risk_court ?? {};
  const thresholds = ssot?.thresholds ?? {};

  const maxDdPct = cfg.max_drawdown_pct ?? thresholds.max_penalized_maxdd_pct ?? DEFAULTS.max_drawdown_pct;
  const maxDailyLossUsd = cfg.max_daily_loss_usd ?? ssot?.truth_layer?.max_daily_loss_halt_usd ?? DEFAULTS.max_daily_loss_usd;
  const maxVar95 = cfg.max_var_95_pct ?? DEFAULTS.max_var_95_pct;
  const maxTailLoss = cfg.max_tail_loss_pct ?? DEFAULTS.max_tail_loss_pct;

  // ─── 1. Equity curve & max drawdown ──────────────────────────────────────
  const initialEquity = risk.initial_equity_usd ?? ssot?.risk_governor?.initial_equity_usd ?? 10000;
  let equity = edge.equity_curve;
  if (!equity && trades.length > 0) {
    // Build equity curve anchored to initial equity so drawdown is relative to real capital.
    let cumEq = initialEquity;
    equity = trades.map((t) => {
      cumEq += t.pnl ?? 0;
      return cumEq;
    });
  }
  const maxDd = computeMaxDrawdown(equity || []);
  evidence.max_drawdown_pct = Math.round(maxDd * 10000) / 10000;
  evidence.max_drawdown_threshold = maxDdPct;
  if (maxDd > maxDdPct) {
    reason_codes.push(REASON_CODES.DRAWDOWN_EXCEEDS_THRESHOLD);
  }

  // ─── 2. Tail risk (VaR & ES) ──────────────────────────────────────────────
  const returns = trades.map((t) => t.pnl_pct ?? (t.pnl ?? 0) / Math.max(1, Math.abs(t.notional_usd ?? 1)));
  const var95 = computeVaR(returns, 0.95);
  const es95 = computeExpectedShortfall(returns, 0.95);
  evidence.var_95_pct = Math.round(var95 * 10000) / 10000;
  evidence.es_95_pct = Math.round(es95 * 10000) / 10000;
  evidence.max_var_95_threshold = maxVar95;
  evidence.max_tail_loss_threshold = maxTailLoss;
  if (var95 > maxVar95) {
    warnings.push(`VaR 95% = ${(var95 * 100).toFixed(2)}% exceeds threshold ${(maxVar95 * 100).toFixed(2)}%`);
  }
  if (es95 > maxTailLoss) {
    reason_codes.push(REASON_CODES.TAIL_RISK_UNACCEPTABLE);
  }

  // ─── 3. Kill-switch compatibility ────────────────────────────────────────
  const killSwitchCompatible = risk.kill_switch_compatible ?? true;
  evidence.kill_switch_compatible = killSwitchCompatible;
  if (!killSwitchCompatible) {
    reason_codes.push(REASON_CODES.KILL_SWITCH_INCOMPATIBLE);
  }

  // ─── 4. Catastrophic loss mode detection ─────────────────────────────────
  // Catastrophic = any single trade loss > 50% of max_daily_loss_usd
  const catastrophicThreshold = maxDailyLossUsd * 0.5;
  const catastrophicTrades = trades.filter((t) => (t.pnl ?? 0) < -catastrophicThreshold);
  evidence.catastrophic_trades = catastrophicTrades.length;
  evidence.catastrophic_loss_threshold_usd = catastrophicThreshold;
  if (catastrophicTrades.length > 0) {
    reason_codes.push(REASON_CODES.CATASTROPHIC_LOSS_MODE);
  }

  // ─── 5. Correlation risk ──────────────────────────────────────────────────
  const corrMarket = risk.correlation_with_market ?? null;
  evidence.correlation_with_market = corrMarket;
  if (corrMarket != null && Math.abs(corrMarket) > 0.8) {
    warnings.push(`High market correlation ${corrMarket.toFixed(2)} — strategy may not provide diversification`);
  }

  // ─── Verdict ──────────────────────────────────────────────────────────────
  let verdict;
  if (reason_codes.includes(REASON_CODES.CATASTROPHIC_LOSS_MODE) || reason_codes.includes(REASON_CODES.KILL_SWITCH_INCOMPATIBLE)) {
    verdict = VERDICTS.NOT_ELIGIBLE;
  } else if (reason_codes.length > 0) {
    verdict = VERDICTS.NOT_ELIGIBLE;
  } else {
    verdict = VERDICTS.PIPELINE_ELIGIBLE;
  }

  return {
    court: 'RiskCourt',
    verdict,
    reason_codes,
    warnings,
    evidence_summary: evidence,
    next_actions: _nextActions(verdict, reason_codes),
  };
}

function _nextActions(verdict, codes) {
  if (verdict === VERDICTS.PIPELINE_ELIGIBLE) return ['Risk profile validated — proceed to Overfit Court'];
  const actions = [];
  if (codes.includes(REASON_CODES.CATASTROPHIC_LOSS_MODE))
    actions.push('REJECT: Catastrophic loss mode detected — add hard per-trade stop-loss');
  if (codes.includes(REASON_CODES.KILL_SWITCH_INCOMPATIBLE))
    actions.push('Ensure strategy implements kill-switch protocol before resubmission');
  if (codes.includes(REASON_CODES.DRAWDOWN_EXCEEDS_THRESHOLD))
    actions.push('Reduce position sizing or add drawdown-based scaling');
  if (codes.includes(REASON_CODES.TAIL_RISK_UNACCEPTABLE))
    actions.push('Investigate tail losses — add hard stop or reduce leverage');
  return actions.length ? actions : ['Investigate risk metrics against thresholds'];
}
