/**
 * edge_adapter.mjs — Converts backtest engine output to Edge Lab court input
 *
 * BRIDGES THE GAP: backtest/engine.mjs → edge_lab/pipeline.mjs
 *
 * The adapter creates a synthetic edge descriptor from backtest results
 * that Edge Lab courts can validate. This enables the integration:
 *   strategy_sweep → backtest x2 → edge_adapter → Edge Lab courts → CandidateFSM
 *
 * ZERO external dependencies beyond project modules.
 */

import { truncateTowardZero } from './deterministic_math.mjs';

/**
 * Convert backtest result + bars into an edge descriptor for Edge Lab.
 * @param {Object} backtestResult — from runBacktest()
 * @param {Array} bars — OHLCV bars used in backtest
 * @param {Object} [opts]
 * @param {string} [opts.edge_id] — identifier for this edge
 * @param {string} [opts.strategy_id] — strategy identifier
 * @returns {Object} — edge descriptor compatible with Edge Lab courts
 */
export function backtestToEdge(backtestResult, bars, opts = {}) {
  const m = backtestResult.metrics;
  const edgeId = opts.edge_id || `edge_${m.strategy}_${m.bars || 0}`;
  const strategyId = opts.strategy_id || m.strategy;

  // Build synthetic execution metrics from backtest fills
  const fills = backtestResult.ledger.fills;
  const filledTrades = fills.filter(f => f.realized_pnl !== 0);
  const tradeReturns = fills.filter(f => f.realized_pnl !== 0).map(f => f.realized_pnl);

  // Compute slippage statistics in bps
  const slippageBps = fills.map(f =>
    f.price > 0 ? (f.slippage / (f.price * f.qty)) * 10000 : 0
  ).sort((a, b) => a - b);

  const latencyMs = fills.map(() => 1); // backtest = instant

  return {
    edge_id: edgeId,
    strategy_id: strategyId,
    strategy_name: m.strategy,

    // DatasetCourt fields
    dataset: {
      bar_count: bars.length,
      timeframe: bars[0]?.interval || '5m',
      symbols: [...new Set(bars.map(b => b.symbol).filter(Boolean))],
      start_ts: bars[0]?.ts_open,
      end_ts: bars[bars.length - 1]?.ts_close,
      source: 'BACKTEST_FIXTURE',
      proxy_assets: [],
      data_quality_score: 1.0, // perfect quality for synthetic fixtures
    },

    // ExecutionCourt fields
    execution: {
      trade_count: filledTrades.length,
      fill_rate: 1.0, // backtest = 100% fill
      avg_slippage_bps: slippageBps.length > 0
        ? truncateTowardZero(slippageBps.reduce((a, b) => a + b, 0) / slippageBps.length, 4)
        : 0,
      p95_slippage_bps: slippageBps.length > 0
        ? slippageBps[Math.floor(slippageBps.length * 0.95)] || 0
        : 0,
      p99_slippage_bps: slippageBps.length > 0
        ? slippageBps[Math.floor(slippageBps.length * 0.99)] || 0
        : 0,
      avg_latency_ms: 1,
      p95_latency_ms: 1,
      p99_latency_ms: 1,
      partial_fill_rate: 0,
      reject_ratio: 0,
    },

    // RiskCourt fields
    risk: {
      max_drawdown_pct: truncateTowardZero((m.max_drawdown || 0) * 100, 4),
      total_pnl: m.total_pnl,
      return_pct: m.return_pct,
      sharpe: m.backtest_sharpe,
      sortino: m.sortino || 0,
      calmar: m.calmar || 0,
      initial_capital: m.initial_capital,
      final_equity: m.equity,
      total_fees: m.total_fees,
      total_slippage_usd: m.total_slippage,
    },

    // OverfitCourt fields
    overfit: {
      backtest_sharpe: m.backtest_sharpe,
      trade_count: m.trade_count,
      trade_returns: tradeReturns,
      params: m.params,
    },

    // RedTeamCourt fields
    red_team: {
      win_rate: filledTrades.filter(f => f.realized_pnl > 0).length / Math.max(1, filledTrades.length),
      profit_factor: (() => {
        const grossWin = filledTrades.filter(f => f.realized_pnl > 0)
          .reduce((a, f) => a + f.realized_pnl, 0);
        const grossLoss = Math.abs(filledTrades.filter(f => f.realized_pnl < 0)
          .reduce((a, f) => a + f.realized_pnl, 0));
        return grossLoss > 0 ? truncateTowardZero(grossWin / grossLoss, 4) : (grossWin > 0 ? 999 : 0);
      })(),
      anomalies: m.anomalies,
    },

    // SREReliabilityCourt fields
    sre: {
      uptime_pct: 100,
      error_rate: 0,
      data_freshness_ms: 0,
      monitoring_coverage: 1.0,
    },

    // Equity curve (W1.2)
    equity_curve: backtestResult.equity_curve || [],
  };
}

/**
 * Create a minimal edge descriptor for testing.
 */
export function createMinimalEdge(strategyName, metrics) {
  return backtestToEdge(
    { metrics, ledger: { fills: [] }, equity_curve: [] },
    [],
    { strategy_id: strategyName }
  );
}
