// core/edge_lab/courts/execution_sensitivity_court.mjs — Execution Sensitivity Court
// Doctrine: if profitability fails at 2× expected slippage → NOT_ELIGIBLE.
// Sensitivity grid required. No proxy allowed to influence verdict.

import { VERDICTS, REASON_CODES } from '../verdicts.mjs';

const SLIPPAGE_MULTIPLIERS = [1.0, 1.5, 2.0, 3.0];

/**
 * Simulate PnL under a given slippage multiplier.
 * Uses linear approximation: each trade's PnL degrades by slippage cost.
 * @param {Array} trades
 * @param {number} baseSlippageBps - Expected slippage per trade in bps
 * @param {number} multiplier
 * @returns {number} simulated total PnL
 */
function simulatePnlAtSlippage(trades, baseSlippageBps, multiplier) {
  const slippageBps = baseSlippageBps * multiplier;
  let totalPnl = 0;
  for (const t of trades) {
    const notional = t.notional_usd ?? Math.abs((t.entry_price ?? 0) * (t.qty ?? 1));
    const slippageCost = (slippageBps / 10000) * notional;
    totalPnl += t.pnl - slippageCost;
  }
  return totalPnl;
}

/**
 * @param {Object} edge
 *   edge.trades         {Array}  - Trade records with { pnl, notional_usd?, entry_price?, qty? }
 *   edge.execution      {Object} - { slippage_p99_bps, base_slippage_bps }
 * @param {Object} ssot
 */
export function runExecutionSensitivityCourt(edge, ssot) {
  const reason_codes = [];
  const warnings = [];
  const evidence = {};

  const trades = edge.trades || [];
  const ex = edge.execution || {};
  const cfg = ssot?.edge_lab?.sensitivity_court ?? {};

  const baseSlippageBps = ex.base_slippage_bps ?? ex.slippage_p99_bps ?? cfg.base_slippage_bps ?? 5;
  const criticalMultiplier = cfg.critical_multiplier ?? 2.0;
  const multipliers = cfg.slippage_multipliers ?? SLIPPAGE_MULTIPLIERS;

  // Build sensitivity grid
  const grid = [];
  for (const mult of multipliers) {
    const simPnl = simulatePnlAtSlippage(trades, baseSlippageBps, mult);
    grid.push({ multiplier: mult, simulated_pnl_usd: Math.round(simPnl * 100) / 100 });
  }

  evidence.base_slippage_bps = baseSlippageBps;
  evidence.sensitivity_grid = grid;
  evidence.critical_multiplier = criticalMultiplier;

  // Critical check: must be profitable at 2× slippage
  const criticalRow = grid.find((r) => r.multiplier === criticalMultiplier);
  if (criticalRow) {
    evidence.pnl_at_critical_multiplier = criticalRow.simulated_pnl_usd;
    if (criticalRow.simulated_pnl_usd <= 0) {
      reason_codes.push(REASON_CODES.FAILS_2X_SLIPPAGE);
    }
  } else {
    // Critical multiplier not in grid — treat as fail
    reason_codes.push(REASON_CODES.SENSITIVITY_GRID_REJECTED);
    warnings.push(`Critical multiplier ${criticalMultiplier}× not found in sensitivity grid`);
  }

  // Additional: warn if profitable at 1× but not at 1.5×
  const row15 = grid.find((r) => r.multiplier === 1.5);
  if (row15 && row15.simulated_pnl_usd <= 0 && !reason_codes.includes(REASON_CODES.FAILS_2X_SLIPPAGE)) {
    warnings.push('Edge fails profitability at 1.5× slippage — fragile execution assumption');
    reason_codes.push(REASON_CODES.SENSITIVITY_GRID_REJECTED);
  }

  let verdict;
  if (reason_codes.length === 0) {
    verdict = VERDICTS.PIPELINE_ELIGIBLE;
  } else {
    verdict = VERDICTS.NOT_ELIGIBLE;
  }

  return {
    court: 'ExecutionSensitivityCourt',
    verdict,
    reason_codes,
    warnings,
    evidence_summary: evidence,
    next_actions: _nextActions(verdict, reason_codes),
  };
}

function _nextActions(verdict, codes) {
  if (verdict === VERDICTS.PIPELINE_ELIGIBLE)
    return ['Sensitivity grid passed — proceed to Risk Court'];
  if (codes.includes(REASON_CODES.FAILS_2X_SLIPPAGE))
    return [
      'Edge does not survive 2× slippage stress — reduce per-trade cost structure or improve edge quality',
      'Consider tighter limit orders, smaller position sizes, or higher-liquidity venues',
    ];
  return ['Review sensitivity grid results and address fragile execution assumptions'];
}
