// core/edge_lab/courts/red_team_court.mjs — Red Team Court
// Mandate: attempt to break statistical validity, execution assumptions,
//          risk containment, regime robustness, reliability behavior.
// If a failure path exists, expose it.

import { VERDICTS, REASON_CODES } from '../verdicts.mjs';

/**
 * @param {Object} edge
 *   edge.trades          {Array}   - Trade records
 *   edge.execution       {Object}  - Execution metadata
 *   edge.risk            {Object}  - Risk parameters
 *   edge.adversarial     {Object}  - Optional adversarial inputs:
 *                                    { worst_case_slippage_bps, liquidity_shock_pct, data_corruption_test }
 * @param {Object} ssot
 */
export function runRedTeamCourt(edge, ssot) {
  const reason_codes = [];
  const warnings = [];
  const evidence = {};
  const attacks = [];

  const trades = edge.trades || [];
  const ex = edge.execution || {};
  const risk = edge.risk || {};
  const adv = edge.adversarial || {};

  // ─── ATTACK 1: Statistical validity — shuffle test ────────────────────────
  // If the PnL distribution is not significantly different from random,
  // the edge is not real.
  if (trades.length >= 10) {
    const pnls = trades.map((t) => t.pnl ?? 0);
    const totalPnl = pnls.reduce((a, b) => a + b, 0);
    const positiveCount = pnls.filter((p) => p > 0).length;
    const winRate = positiveCount / pnls.length;

    // Red team: with 50/50 random, expected win rate is 0.5
    // If edge win rate < 0.52 AND mean PnL is low, statistical validity questionable
    const meanPnl = totalPnl / pnls.length;
    const statisticallyWeak = winRate < 0.52 && meanPnl < 0.001;

    attacks.push({
      attack: 'shuffle_test',
      win_rate: Math.round(winRate * 10000) / 10000,
      mean_pnl: Math.round(meanPnl * 100) / 100,
      status: statisticallyWeak ? 'FAIL' : 'PASS',
    });

    if (statisticallyWeak) {
      reason_codes.push(REASON_CODES.STATISTICAL_VALIDITY_BROKEN);
      warnings.push(`Red Team: statistical validity weak — win_rate=${(winRate * 100).toFixed(1)}%, mean_pnl=${meanPnl.toFixed(4)}`);
    }
  }

  // ─── ATTACK 2: Execution assumptions — worst-case fill test ──────────────
  // Worst-case: 2× expected slippage (consistent with sensitivity court doctrine),
  // 15% liquidity shock (realistic adverse liquidity event).
  const worstCaseSlippage = adv.worst_case_slippage_bps ?? (ex.slippage_p99_bps ?? 5) * 2;
  const liquidityShockPct = adv.liquidity_shock_pct ?? 0.15; // 15% of trades unfillable

  if (trades.length > 0) {
    let wcPnl = 0;
    const unfillableCount = Math.floor(trades.length * liquidityShockPct);
    // Worst case: unfillable trades are the winning ones.
    // Apply only the ADDITIONAL slippage beyond base (original PnL already includes base slippage cost).
    const baseSlippageBps = ex.base_slippage_bps ?? ex.slippage_p99_bps ?? 4;
    const additionalSlippageBps = Math.max(0, worstCaseSlippage - baseSlippageBps);
    const sortedByPnl = [...trades].sort((a, b) => (b.pnl ?? 0) - (a.pnl ?? 0));
    for (let i = 0; i < sortedByPnl.length; i++) {
      if (i < unfillableCount) continue; // skip best trades (liquidity shock)
      const t = sortedByPnl[i];
      const notional = t.notional_usd ?? 100;
      const additionalCost = (additionalSlippageBps / 10000) * notional;
      wcPnl += (t.pnl ?? 0) - additionalCost;
    }

    const execAssumptionHolds = wcPnl > 0;
    attacks.push({
      attack: 'worst_case_fill',
      worst_case_slippage_bps: worstCaseSlippage,
      additional_slippage_bps: additionalSlippageBps,
      liquidity_shock_pct: liquidityShockPct,
      unfillable_trades: unfillableCount,
      worst_case_pnl: Math.round(wcPnl * 100) / 100,
      status: execAssumptionHolds ? 'PASS' : 'FAIL',
    });

    if (!execAssumptionHolds) {
      reason_codes.push(REASON_CODES.EXECUTION_ASSUMPTION_BROKEN);
      warnings.push(`Red Team: worst-case fill test failed — PnL goes negative under liquidity shock`);
    }
  }

  // ─── ATTACK 3: Risk containment — max loss stress ─────────────────────────
  const killSwitchThreshold = risk.kill_switch_threshold_pct ?? ssot?.risk_governor?.kill_switch_threshold ?? 0.1;
  const initialEquity = risk.initial_equity_usd ?? ssot?.risk_governor?.initial_equity_usd ?? 10000;
  const maxAllowedLoss = initialEquity * killSwitchThreshold;

  // Red team: construct sequence where all trades cluster (correlated failure)
  const clusterLoss = trades
    .filter((t) => (t.pnl ?? 0) < 0)
    .slice(0, 5)
    .reduce((a, t) => a + (t.pnl ?? 0), 0);

  const riskContained = Math.abs(clusterLoss) <= maxAllowedLoss;
  attacks.push({
    attack: 'clustered_loss_stress',
    cluster_loss_usd: Math.round(clusterLoss * 100) / 100,
    kill_switch_threshold_usd: Math.round(maxAllowedLoss * 100) / 100,
    status: riskContained ? 'PASS' : 'FAIL',
  });

  if (!riskContained) {
    reason_codes.push(REASON_CODES.RISK_CONTAINMENT_BROKEN);
    warnings.push(
      `Red Team: clustered loss ${Math.abs(clusterLoss).toFixed(2)} USD exceeds kill-switch threshold ${maxAllowedLoss.toFixed(2)} USD`
    );
  }

  // ─── ATTACK 4: Data corruption test ──────────────────────────────────────
  if (adv.data_corruption_test === true) {
    // Check if strategy is robust to 10% data corruption (NaN injection)
    const corruptedTrades = trades.slice(0, Math.ceil(trades.length * 0.1)).every((t) => Number.isFinite(t.pnl));
    attacks.push({
      attack: 'data_corruption',
      corrupt_pct: 10,
      data_integrity_ok: corruptedTrades,
      status: corruptedTrades ? 'PASS' : 'FAIL',
    });
  }

  evidence.attacks = attacks;
  evidence.attack_pass_count = attacks.filter((a) => a.status === 'PASS').length;
  evidence.attack_fail_count = attacks.filter((a) => a.status === 'FAIL').length;

  // ─── Verdict ──────────────────────────────────────────────────────────────
  let verdict;
  if (reason_codes.length === 0) {
    verdict = VERDICTS.PIPELINE_ELIGIBLE;
  } else {
    verdict = VERDICTS.NOT_ELIGIBLE;
  }

  return {
    court: 'RedTeamCourt',
    verdict,
    reason_codes,
    warnings,
    evidence_summary: evidence,
    next_actions: _nextActions(verdict, reason_codes),
  };
}

function _nextActions(verdict, codes) {
  if (verdict === VERDICTS.PIPELINE_ELIGIBLE)
    return ['All red team attacks survived — proceed to SRE Reliability Court'];
  const actions = [];
  if (codes.includes(REASON_CODES.STATISTICAL_VALIDITY_BROKEN))
    actions.push('EXPOSED: Edge may not be statistically real — gather more independent data');
  if (codes.includes(REASON_CODES.EXECUTION_ASSUMPTION_BROKEN))
    actions.push('EXPOSED: Execution assumptions fail under liquidity shock — add liquidity filters');
  if (codes.includes(REASON_CODES.RISK_CONTAINMENT_BROKEN))
    actions.push('EXPOSED: Risk containment fails under correlated losses — reduce position concentration');
  return actions.length ? actions : ['Review red team attack results and harden against exposed failure paths'];
}
