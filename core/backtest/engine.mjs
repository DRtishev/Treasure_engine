#!/usr/bin/env node
// E108 Track 2: Deterministic Backtest Engine
// Event-driven, bar-by-bar execution with fees + slippage via ledger.
// NO lookahead by design: strategy only sees bars[0..i].

import { createLedger, recordFill, getLedgerSummary, serializeLedger, fillsToMarkdownTable, detectAnomalies } from '../profit/ledger.mjs';
import { stableFormatNumber, renderMarkdownTable } from '../../scripts/verify/foundation_render.mjs';

/**
 * Run a backtest of strategy on bars
 * @param {Object} strategy - Strategy implementing { init, onBar, meta }
 * @param {Array} bars - OHLCV bars sorted by ts_open
 * @param {Object} opts - { params, initial_capital, fee_bps, slip_bps, position_size_usd }
 * @returns {Object} { ledger, signals, metrics, strategy_name }
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

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    // NO-LOOKAHEAD: strategy only sees bars[0..i]
    const history = bars.slice(0, i + 1);
    const result = strategy.onBar(bar, state, history);
    state = result.state;

    const signal = result.signal;
    signals.push({ index: i, ts: bar.ts_open, signal, price: bar.close });

    if (signal === 'BUY' || signal === 'SELL') {
      const qty = position_size_usd / bar.close;
      const slippage = bar.close * (slip_bps / 10000);
      const execPrice = signal === 'BUY' ? bar.close + slippage : bar.close - slippage;
      const fee = position_size_usd * (fee_bps / 10000);

      fillId++;
      recordFill(ledger, {
        symbol: bar.symbol || 'BTCUSDT',
        side: signal,
        qty,
        price: bar.close,
        exec_price: execPrice,
        fee,
        ts: typeof bar.ts_open === 'number' ? new Date(bar.ts_open).toISOString() : bar.ts_open,
        trade_id: `BT${String(fillId).padStart(6, '0')}`
      });
    }
  }

  const lastPrice = bars.length > 0 ? bars[bars.length - 1].close : 0;
  const prices = { [bars[0]?.symbol || 'BTCUSDT']: lastPrice };
  const summary = getLedgerSummary(ledger, prices);
  const anomalies = detectAnomalies(ledger);

  const buyCount = signals.filter(s => s.signal === 'BUY').length;
  const sellCount = signals.filter(s => s.signal === 'SELL').length;

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
    max_drawdown: summary.max_drawdown,
    anomalies: anomalies.length
  };

  return { ledger, signals, metrics, strategy_name: strategy.meta().name };
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
    `- anomalies: ${m.anomalies}`,
    ''
  ];
  return lines.join('\n');
}
