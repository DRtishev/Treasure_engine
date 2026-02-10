// core/sim/metrics.mjs
// Calculate performance and execution metrics (E2.1 P0.5: attempts observability)

export function calculateMetrics(trades) {
  const filledTrades = trades.filter(t => t.filled);
  const rejectedTrades = trades.filter(t => t.rejected);

  const tradeCountTotal = trades.length;
  const tradeCountFilled = filledTrades.length;
  const tradeCountRejected = rejectedTrades.length;

  if (tradeCountTotal === 0 || tradeCountFilled === 0) {
    return {
      trade_count: 0,
      trade_count_total: tradeCountTotal,
      trade_count_filled: tradeCountFilled,
      trade_count_rejected: tradeCountRejected,
      expectancy_per_trade: 0,
      max_drawdown_pct: 0,
      win_rate: 0,
      profit_factor: 0,
      fill_ratio: 0,
      partial_fill_rate: 0,
      reject_ratio: tradeCountTotal > 0 ? (tradeCountRejected / tradeCountTotal) : 0,
      slippage_p95_bps: 0,
      slippage_p99_bps: 0,
      rtt_p95_ms: 0,
      rtt_p99_ms: 0
    };
  }

  const pnls = filledTrades.map(t => t.pnl);
  const totalPnl = pnls.reduce((a, b) => a + b, 0);
  const expectancy = totalPnl / pnls.length;

  let equity = 1.0;
  let peakEquity = 1.0;
  let maxDD = 0;
  for (const pnl of pnls) {
    equity = equity * (1 + pnl);
    if (equity > peakEquity) peakEquity = equity;
    const dd = (peakEquity - equity) / peakEquity;
    if (dd > maxDD) maxDD = dd;
  }
  const maxDDPct = maxDD;

  const wins = pnls.filter(p => p > 0).length;
  const winRate = wins / pnls.length;

  const grossWin = pnls.filter(p => p > 0).reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(pnls.filter(p => p < 0).reduce((a, b) => a + b, 0));
  const profitFactor = grossLoss > 0 ? (grossWin / grossLoss) : (grossWin > 0 ? 999 : 0);

  const fillRatios = filledTrades.map(t => t.fill_ratio);
  const avgFillRatio = fillRatios.reduce((a, b) => a + b, 0) / fillRatios.length;
  const partialFillRate = fillRatios.filter(f => f < 0.99).length / fillRatios.length;
  const rejectRatio = tradeCountRejected / tradeCountTotal;

  const slippages = filledTrades.map(t => t.slippage_bps).sort((a, b) => a - b);
  const slipP95 = slippages[Math.floor(slippages.length * 0.95)] || 0;
  const slipP99 = slippages[Math.floor(slippages.length * 0.99)] || 0;

  const latencies = filledTrades.map(t => t.latency_ms).sort((a, b) => a - b);
  const rttP95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const rttP99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

  return {
    trade_count: tradeCountFilled,
    trade_count_total: tradeCountTotal,
    trade_count_filled: tradeCountFilled,
    trade_count_rejected: tradeCountRejected,
    expectancy_per_trade: expectancy,
    max_drawdown_pct: maxDDPct,
    win_rate: winRate,
    profit_factor: profitFactor,
    fill_ratio: avgFillRatio,
    partial_fill_rate: partialFillRate,
    reject_ratio: rejectRatio,
    slippage_p95_bps: slipP95,
    slippage_p99_bps: slipP99,
    rtt_p95_ms: rttP95,
    rtt_p99_ms: rttP99
  };
}

export function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * p);
  return sorted[idx] || 0;
}
