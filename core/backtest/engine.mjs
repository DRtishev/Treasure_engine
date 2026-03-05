#!/usr/bin/env node
// E108 Track 2: Deterministic Backtest Engine
// Event-driven, bar-by-bar execution with fees + slippage via ledger.
// NO lookahead by design: strategy only sees bars[0..i].
// W1.1: Uses unified_sharpe.mjs as SSOT for all risk-adjusted metrics.
// W1.2: Equity Curve Surgery — frame-by-frame equity tracking.

import { createLedger, recordFill, getLedgerSummary, getEquity, getUnrealizedPnL, serializeLedger, fillsToMarkdownTable, detectAnomalies } from '../profit/ledger.mjs';
import { stableFormatNumber, renderMarkdownTable } from '../../scripts/verify/foundation_render.mjs';
import { truncateTowardZero } from '../edge/deterministic_math.mjs';
import { sharpeFromTrades, sortino, calmar, ulcerIndex, painRatio } from '../edge/unified_sharpe.mjs';
// Sprint 7: PARITY LAW — unified cost model (opt-in via opts.use_cost_model)
import { computeTotalCost } from '../cost/cost_model.mjs';

/**
 * Run a backtest of strategy on bars
 * @param {Object} strategy - Strategy implementing { init, onBar, meta }
 * @param {Array} bars - OHLCV bars sorted by ts_open
 * @param {Object} opts - { params, initial_capital, fee_bps, slip_bps, position_size_usd }
 * @returns {Object} { ledger, signals, metrics, equity_curve, strategy_name }
 */
export function runBacktest(strategy, bars, opts = {}) {
  const params = { ...strategy.meta().default_params, ...(opts.params || {}) };
  const initial_capital = opts.initial_capital || 10000;
  const fee_bps = opts.fee_bps || 4;
  const slip_bps = opts.slip_bps || 2;
  const position_size_usd = opts.position_size_usd || 500;

  const ledger = createLedger({ initial_capital });
  let state = strategy.init(params);
  const signals = [];
  let fillId = 0;

  // W1.2: Equity Curve Surgery — frame-by-frame tracking
  const equityCurve = [];
  let hwm = initial_capital;
  const symbol = bars[0]?.symbol || 'BTCUSDT';

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    // NO-LOOKAHEAD: strategy only sees bars[0..i]
    const history = bars.slice(0, i + 1);
    const result = strategy.onBar(bar, state, history);
    state = result.state;

    const signal = result.signal;
    signals.push({ index: i, ts: bar.ts_open, signal, price: bar.close });

    if (signal === 'BUY' || signal === 'SELL') {
      const rawQty = position_size_usd / bar.close;
      let execPrice, fee, filledQty;

      if (opts.use_cost_model) {
        // Sprint 7: PARITY LAW path — unified cost model
        const costResult = computeTotalCost({
          price: bar.close,
          qty: rawQty,
          side: signal,
          order_type: 'TAKER',
          mode: 'backtest',
          market_context: opts.market_context || {},
          config: opts.cost_config || {}
        });
        execPrice = costResult.exec_price;
        fee = costResult.fee_usd;
        filledQty = costResult.filled_qty;
      } else {
        // Legacy path (backward compatible)
        const slippage = bar.close * (slip_bps / 10000);
        execPrice = signal === 'BUY' ? bar.close + slippage : bar.close - slippage;
        fee = position_size_usd * (fee_bps / 10000);
        filledQty = rawQty;
      }

      fillId++;
      recordFill(ledger, {
        symbol: bar.symbol || symbol,
        side: signal,
        qty: filledQty,
        price: bar.close,
        exec_price: execPrice,
        fee,
        ts: typeof bar.ts_open === 'number' ? new Date(bar.ts_open).toISOString() : bar.ts_open,
        trade_id: `BT${String(fillId).padStart(6, '0')}`
      });
    }

    // W1.2: Record equity snapshot at each bar
    const prices = { [symbol]: bar.close };
    const equity = getEquity(ledger, prices);
    if (equity > hwm) hwm = equity;
    const dd = hwm > 0 ? (hwm - equity) / hwm : 0;
    const pos = ledger.positions[symbol] || { qty: 0 };

    equityCurve.push({
      bar_index: i,
      ts: bar.ts_open,
      equity: truncateTowardZero(equity, 4),
      drawdown: truncateTowardZero(dd, 6),
      position_qty: pos.qty,
      unrealized_pnl: truncateTowardZero(getUnrealizedPnL(ledger, prices), 4)
    });
  }

  const lastPrice = bars.length > 0 ? bars[bars.length - 1].close : 0;
  const prices = { [symbol]: lastPrice };
  const summary = getLedgerSummary(ledger, prices);
  const anomalies = detectAnomalies(ledger);

  const buyCount = signals.filter(s => s.signal === 'BUY').length;
  const sellCount = signals.filter(s => s.signal === 'SELL').length;

  // W1.1: Unified Sharpe — SSOT from unified_sharpe.mjs
  const tradeReturns = ledger.fills
    .filter(f => f.realized_pnl !== 0)
    .map(f => f.realized_pnl / position_size_usd);
  const backtest_sharpe = sharpeFromTrades(tradeReturns, 6);

  // W1.2: Compute advanced metrics from equity curve
  const drawdowns = equityCurve.map(e => e.drawdown);
  const equityValues = equityCurve.map(e => e.equity);

  // Max drawdown from equity curve (W1.4: precision fix — uses all bars, not just fills)
  let maxDrawdownFromCurve = 0;
  for (const dd of drawdowns) { if (dd > maxDrawdownFromCurve) maxDrawdownFromCurve = dd; }

  // Max drawdown duration (bars underwater)
  let maxDDDuration = 0;
  let currentDDDuration = 0;
  for (const dd of drawdowns) {
    if (dd > 0) {
      currentDDDuration++;
      if (currentDDDuration > maxDDDuration) maxDDDuration = currentDDDuration;
    } else {
      currentDDDuration = 0;
    }
  }

  // Recovery factor, Sortino, Calmar, Ulcer Index, Pain Ratio
  const annualizedReturn = summary.return_pct; // simplified: already percentage
  const sortinoRatio = tradeReturns.length >= 2 ? truncateTowardZero(sortino(tradeReturns), 6) : 0;
  const calmarRatio = maxDrawdownFromCurve > 0 ? truncateTowardZero(calmar(annualizedReturn / 100, maxDrawdownFromCurve), 6) : 0;
  const ulcerIdx = drawdowns.length > 0 ? truncateTowardZero(ulcerIndex(drawdowns), 6) : 0;
  const painR = ulcerIdx > 0 ? truncateTowardZero(painRatio(annualizedReturn / 100, ulcerIdx), 6) : 0;
  const recoveryFactor = maxDrawdownFromCurve > 0 ? truncateTowardZero(summary.return_pct / (maxDrawdownFromCurve * 100), 6) : 0;

  const metrics = {
    strategy: strategy.meta().name,
    params,
    bars: bars.length,
    buys: buyCount,
    sells: sellCount,
    fills: summary.total_fills,
    initial_capital: summary.initial_capital,
    equity: summary.equity,
    realized_pnl: summary.realized_pnl,
    unrealized_pnl: summary.unrealized_pnl,
    total_pnl: summary.total_pnl,
    return_pct: summary.return_pct,
    total_fees: summary.total_fees,
    total_slippage: summary.total_slippage,
    max_drawdown: maxDrawdownFromCurve,
    max_drawdown_duration_bars: maxDDDuration,
    anomalies: anomalies.length,
    backtest_sharpe,
    sortino: sortinoRatio,
    calmar: calmarRatio,
    ulcer_index: ulcerIdx,
    pain_ratio: painR,
    recovery_factor: recoveryFactor,
    trade_count: tradeReturns.length
  };

  return { ledger, signals, metrics, equity_curve: equityCurve, strategy_name: strategy.meta().name };
}

/**
 * Generate markdown report from backtest result
 */
export function backtestToMarkdown(result) {
  const m = result.metrics;
  const lines = [
    `## ${m.strategy}`,
    `- params: ${JSON.stringify(m.params)}`,
    `- bars: ${m.bars}`,
    `- fills: ${m.fills} (BUY=${m.buys} SELL=${m.sells})`,
    `- equity: ${stableFormatNumber(m.equity, 2)}`,
    `- realized_pnl: ${stableFormatNumber(m.realized_pnl, 4)}`,
    `- unrealized_pnl: ${stableFormatNumber(m.unrealized_pnl, 4)}`,
    `- total_pnl: ${stableFormatNumber(m.total_pnl, 4)}`,
    `- return_pct: ${stableFormatNumber(m.return_pct, 4)}%`,
    `- total_fees: ${stableFormatNumber(m.total_fees, 4)}`,
    `- total_slippage: ${stableFormatNumber(m.total_slippage, 4)}`,
    `- max_drawdown: ${stableFormatNumber(m.max_drawdown * 100, 4)}%`,
    `- max_drawdown_duration: ${m.max_drawdown_duration_bars} bars`,
    `- backtest_sharpe: ${stableFormatNumber(m.backtest_sharpe, 6)}`,
    `- sortino: ${stableFormatNumber(m.sortino, 6)}`,
    `- calmar: ${stableFormatNumber(m.calmar, 6)}`,
    `- recovery_factor: ${stableFormatNumber(m.recovery_factor, 6)}`,
    `- anomalies: ${m.anomalies}`,
    ''
  ];
  return lines.join('\n');
}
