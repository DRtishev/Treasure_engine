/**
 * parity_score.mjs — R2.3 Paper↔Live Parity Score
 *
 * Compares paper simulation fills vs live/dryrun fills for the same signals.
 * Produces per-dimension parity + composite score.
 *
 * Deterministic, pure function, no side effects.
 */

/**
 * Compute parity score between paper and live fill summaries.
 *
 * @param {Object} paper — { total_fees, total_slippage, total_funding, realized_pnl, total_fills, fill_rate }
 * @param {Object} live — { total_fees, total_slippage, total_funding, realized_pnl, total_fills, fill_rate }
 * @param {Object} [thresholds] — optional override thresholds
 * @returns {Object} parity breakdown + composite score
 */
export function computeParityScore(paper, live, thresholds = {}) {
  const t = {
    fee_warn_bps: thresholds.fee_warn_bps || 10,
    fee_fail_bps: thresholds.fee_fail_bps || 50,
    slip_warn_bps: thresholds.slip_warn_bps || 20,
    slip_fail_bps: thresholds.slip_fail_bps || 100,
    fill_rate_warn_pct: thresholds.fill_rate_warn_pct || 5,
    fill_rate_fail_pct: thresholds.fill_rate_fail_pct || 20,
    pnl_warn_pct: thresholds.pnl_warn_pct || 10,
    pnl_fail_pct: thresholds.pnl_fail_pct || 50,
  };

  // Fee parity (bps of total notional — approximate via fills × avg price)
  const fee_diff = Math.abs((paper.total_fees || 0) - (live.total_fees || 0));
  const fee_base = Math.max(paper.total_fees || 0, live.total_fees || 0, 0.0001);
  const fee_parity_pct = (fee_diff / fee_base) * 100;

  // Slippage parity
  const slip_diff = Math.abs((paper.total_slippage || 0) - (live.total_slippage || 0));
  const slip_base = Math.max(paper.total_slippage || 0, live.total_slippage || 0, 0.0001);
  const slippage_parity_pct = (slip_diff / slip_base) * 100;

  // Fill rate parity
  const paper_fill_rate = paper.fill_rate !== undefined ? paper.fill_rate : (paper.total_fills || 0);
  const live_fill_rate = live.fill_rate !== undefined ? live.fill_rate : (live.total_fills || 0);
  const fill_rate_diff = Math.abs(paper_fill_rate - live_fill_rate);
  const fill_rate_base = Math.max(paper_fill_rate, live_fill_rate, 1);
  const fill_rate_parity_pct = (fill_rate_diff / fill_rate_base) * 100;

  // PnL parity
  const pnl_diff = Math.abs((paper.realized_pnl || 0) - (live.realized_pnl || 0));
  const pnl_base = Math.max(Math.abs(paper.realized_pnl || 0), Math.abs(live.realized_pnl || 0), 0.01);
  const pnl_parity_pct = (pnl_diff / pnl_base) * 100;

  // Dimension verdicts
  const fee_verdict = fee_parity_pct > t.fee_fail_bps ? 'FAIL' : fee_parity_pct > t.fee_warn_bps ? 'WARN' : 'PASS';
  const slip_verdict = slippage_parity_pct > t.slip_fail_bps ? 'FAIL' : slippage_parity_pct > t.slip_warn_bps ? 'WARN' : 'PASS';
  const fill_verdict = fill_rate_parity_pct > t.fill_rate_fail_pct ? 'FAIL' : fill_rate_parity_pct > t.fill_rate_warn_pct ? 'WARN' : 'PASS';
  const pnl_verdict = pnl_parity_pct > t.pnl_fail_pct ? 'FAIL' : pnl_parity_pct > t.pnl_warn_pct ? 'WARN' : 'PASS';

  // Composite score (0-100): weighted average of dimension scores
  const feeScore = Math.max(0, 100 - fee_parity_pct * 2);
  const slipScore = Math.max(0, 100 - slippage_parity_pct);
  const fillScore = Math.max(0, 100 - fill_rate_parity_pct * 2);
  const pnlScore = Math.max(0, 100 - pnl_parity_pct);

  const composite_parity_score = (feeScore * 0.2 + slipScore * 0.3 + fillScore * 0.2 + pnlScore * 0.3);

  const overall_verdict = [fee_verdict, slip_verdict, fill_verdict, pnl_verdict].includes('FAIL') ? 'FAIL'
    : [fee_verdict, slip_verdict, fill_verdict, pnl_verdict].includes('WARN') ? 'WARN' : 'PASS';

  return {
    fee_parity_pct,
    slippage_parity_pct,
    fill_rate_parity_pct,
    pnl_parity_pct,
    fee_verdict,
    slip_verdict,
    fill_verdict,
    pnl_verdict,
    composite_parity_score,
    overall_verdict,
    dimensions: {
      fee: { diff: fee_diff, pct: fee_parity_pct, verdict: fee_verdict },
      slippage: { diff: slip_diff, pct: slippage_parity_pct, verdict: slip_verdict },
      fill_rate: { diff: fill_rate_diff, pct: fill_rate_parity_pct, verdict: fill_verdict },
      pnl: { diff: pnl_diff, pct: pnl_parity_pct, verdict: pnl_verdict }
    }
  };
}
