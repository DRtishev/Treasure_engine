#!/usr/bin/env node
// E107 Track 2: Daily Report Generator
// Renders markdown report from ledger data (PnL table, trades, drawdown, anomalies)
// Uses foundation_render for stable formatting

import { stableFormatNumber, renderMarkdownTable } from '../verify/foundation_render.mjs';
import { getLedgerSummary, fillsToMarkdownTable, detectAnomalies } from '../../core/profit/ledger.mjs';

/**
 * Generate a daily report from ledger data
 * @param {Object} ledger - The profit ledger
 * @param {Object} prices - Current prices for unrealized PnL { symbol: price }
 * @param {Object} opts - { date, run_id }
 * @returns {string} Markdown report
 */
export function generateDailyReport(ledger, prices = {}, opts = {}) {
  const date = opts.date || '2026-01-01';
  const runId = opts.run_id || 'E107-PAPER-001';

  const summary = getLedgerSummary(ledger, prices);
  const anomalies = detectAnomalies(ledger);

  const lines = [];

  // Header
  lines.push(`# E107 Daily Report: ${date}`);
  lines.push(`- run_id: ${runId}`);
  lines.push(`- generated: ${date}T23:59:59Z`);
  lines.push('');

  // PnL Summary Table
  lines.push('## PnL Summary');
  const pnlHeaders = ['Metric', 'Value'];
  const pnlRows = [
    ['Initial Capital', `${stableFormatNumber(summary.initial_capital, 2)} ${summary.currency}`],
    ['Equity', `${stableFormatNumber(summary.equity, 2)} ${summary.currency}`],
    ['Realized PnL', `${stableFormatNumber(summary.realized_pnl, 4)} ${summary.currency}`],
    ['Unrealized PnL', `${stableFormatNumber(summary.unrealized_pnl, 4)} ${summary.currency}`],
    ['Total PnL', `${stableFormatNumber(summary.total_pnl, 4)} ${summary.currency}`],
    ['Return %', `${stableFormatNumber(summary.return_pct, 4)}%`],
    ['Total Fees', `${stableFormatNumber(summary.total_fees, 4)} ${summary.currency}`],
    ['Total Slippage', `${stableFormatNumber(summary.total_slippage, 4)} ${summary.currency}`],
    ['Max Drawdown', `${stableFormatNumber(summary.max_drawdown * 100, 4)}%`],
    ['Total Fills', `${summary.total_fills}`]
  ];
  lines.push(renderMarkdownTable(pnlHeaders, pnlRows));
  lines.push('');

  // Trades Table
  lines.push('## Trades');
  if (ledger.fills.length > 0) {
    lines.push(fillsToMarkdownTable(ledger));
  } else {
    lines.push('No trades recorded.');
  }
  lines.push('');

  // Drawdown
  lines.push('## Drawdown');
  lines.push(`- max_drawdown: ${stableFormatNumber(summary.max_drawdown * 100, 4)}%`);
  lines.push(`- high_watermark: ${stableFormatNumber(ledger.high_watermark, 2)} ${summary.currency}`);
  lines.push('');

  // Anomalies
  lines.push('## Anomalies');
  if (anomalies.length === 0) {
    lines.push('No anomalies detected.');
  } else {
    for (const a of anomalies) {
      if (a.type === 'HIGH_SLIPPAGE') {
        lines.push(`- HIGH_SLIPPAGE: trade=${a.trade_id} slippage=${stableFormatNumber(a.slippage_bps, 2)}bps`);
      } else if (a.type === 'HIGH_DRAWDOWN') {
        lines.push(`- HIGH_DRAWDOWN: ${stableFormatNumber(a.max_drawdown_pct, 2)}%`);
      } else if (a.type === 'HIGH_FEE_RATIO') {
        lines.push(`- HIGH_FEE_RATIO: ${stableFormatNumber(a.fee_ratio_pct, 4)}%`);
      }
    }
  }
  lines.push('');

  // Footer
  lines.push('## Status');
  lines.push(`- verdict: ${anomalies.length === 0 ? 'CLEAN' : 'ANOMALIES_DETECTED'}`);
  lines.push(`- fills: ${summary.total_fills}`);
  lines.push(`- pnl: ${stableFormatNumber(summary.total_pnl, 4)}`);

  return lines.join('\n') + '\n';
}
