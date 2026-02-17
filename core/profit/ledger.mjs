#!/usr/bin/env node
// E107 Track 2: Profit Ledger
// Records fills, fees, slippage, realized/unrealized PnL
// Deterministic ordering via foundation_render

import { stableSortByKey, stableFormatNumber, renderMarkdownTable } from '../../scripts/verify/foundation_render.mjs';

/**
 * Create a new empty ledger
 */
export function createLedger(config = {}) {
  return {
    initial_capital: config.initial_capital || 10000,
    currency: config.currency || 'USDT',
    fills: [],
    positions: {},  // symbol -> { qty, avg_price, side }
    realized_pnl: 0,
    total_fees: 0,
    total_slippage: 0,
    high_watermark: config.initial_capital || 10000,
    max_drawdown: 0,
    created_at: config.created_at || '2026-01-01T00:00:00Z'
  };
}

/**
 * Record a fill into the ledger
 * @param {Object} ledger - The ledger object
 * @param {Object} fill - { symbol, side, qty, price, exec_price, fee, ts, trade_id }
 * @returns {Object} Updated ledger (mutated)
 */
export function recordFill(ledger, fill) {
  const { symbol, side, qty, price, exec_price, fee = 0, ts, trade_id } = fill;

  const slippage = Math.abs(exec_price - price) * qty;

  const entry = {
    trade_id: trade_id || `T${String(ledger.fills.length + 1).padStart(6, '0')}`,
    ts,
    symbol,
    side,
    qty,
    price,
    exec_price,
    fee,
    slippage,
    realized_pnl: 0
  };

  // Position tracking
  if (!ledger.positions[symbol]) {
    ledger.positions[symbol] = { qty: 0, avg_price: 0 };
  }

  const pos = ledger.positions[symbol];

  if (side === 'BUY') {
    const newQty = pos.qty + qty;
    pos.avg_price = newQty > 0 ? ((pos.avg_price * pos.qty) + (exec_price * qty)) / newQty : 0;
    pos.qty = newQty;
  } else if (side === 'SELL') {
    if (pos.qty > 0) {
      const realizedPerUnit = exec_price - pos.avg_price;
      const sellQty = Math.min(qty, pos.qty);
      entry.realized_pnl = realizedPerUnit * sellQty - fee;
      ledger.realized_pnl += entry.realized_pnl;
      pos.qty -= sellQty;
      if (pos.qty <= 0) {
        pos.qty = 0;
        pos.avg_price = 0;
      }
    }
  }

  ledger.total_fees += fee;
  ledger.total_slippage += slippage;

  // Drawdown tracking
  const equity = getEquity(ledger, {});
  if (equity > ledger.high_watermark) {
    ledger.high_watermark = equity;
  }
  const dd = ledger.high_watermark > 0 ? (ledger.high_watermark - equity) / ledger.high_watermark : 0;
  if (dd > ledger.max_drawdown) {
    ledger.max_drawdown = dd;
  }

  ledger.fills.push(entry);
  return ledger;
}

/**
 * Calculate equity (capital + unrealized PnL)
 * @param {Object} ledger
 * @param {Object} prices - { symbol: current_price }
 */
export function getEquity(ledger, prices = {}) {
  let unrealized = 0;
  for (const [symbol, pos] of Object.entries(ledger.positions)) {
    if (pos.qty > 0 && prices[symbol]) {
      unrealized += (prices[symbol] - pos.avg_price) * pos.qty;
    }
  }
  return ledger.initial_capital + ledger.realized_pnl + unrealized;
}

/**
 * Get unrealized PnL for all positions
 */
export function getUnrealizedPnL(ledger, prices = {}) {
  let total = 0;
  for (const [symbol, pos] of Object.entries(ledger.positions)) {
    if (pos.qty > 0 && prices[symbol]) {
      total += (prices[symbol] - pos.avg_price) * pos.qty;
    }
  }
  return total;
}

/**
 * Get ledger summary
 */
export function getLedgerSummary(ledger, prices = {}) {
  const equity = getEquity(ledger, prices);
  const unrealizedPnl = getUnrealizedPnL(ledger, prices);
  const totalPnl = ledger.realized_pnl + unrealizedPnl;
  const returnPct = ledger.initial_capital > 0
    ? (totalPnl / ledger.initial_capital) * 100
    : 0;

  return {
    initial_capital: ledger.initial_capital,
    equity,
    realized_pnl: ledger.realized_pnl,
    unrealized_pnl: unrealizedPnl,
    total_pnl: totalPnl,
    return_pct: returnPct,
    total_fees: ledger.total_fees,
    total_slippage: ledger.total_slippage,
    max_drawdown: ledger.max_drawdown,
    total_fills: ledger.fills.length,
    currency: ledger.currency
  };
}

/**
 * Export fills as stable markdown table
 */
export function fillsToMarkdownTable(ledger) {
  const headers = ['trade_id', 'ts', 'symbol', 'side', 'qty', 'price', 'exec_price', 'fee', 'slippage', 'realized_pnl'];
  const sorted = stableSortByKey(ledger.fills, 'trade_id');
  const rows = sorted.map(f => [
    f.trade_id,
    f.ts,
    f.symbol,
    f.side,
    stableFormatNumber(f.qty, 6),
    stableFormatNumber(f.price, 2),
    stableFormatNumber(f.exec_price, 2),
    stableFormatNumber(f.fee, 4),
    stableFormatNumber(f.slippage, 4),
    stableFormatNumber(f.realized_pnl, 4)
  ]);
  return renderMarkdownTable(headers, rows);
}

/**
 * Serialize ledger to deterministic JSON
 */
export function serializeLedger(ledger) {
  const sorted = { ...ledger };
  sorted.fills = stableSortByKey(ledger.fills, 'trade_id');
  const posKeys = Object.keys(ledger.positions).sort();
  sorted.positions = {};
  for (const k of posKeys) {
    sorted.positions[k] = ledger.positions[k];
  }
  return JSON.stringify(sorted, null, 2);
}

/**
 * Detect anomalies in ledger
 */
export function detectAnomalies(ledger) {
  const anomalies = [];

  // Large slippage
  for (const f of ledger.fills) {
    const slipBps = f.price > 0 ? (f.slippage / (f.price * f.qty)) * 10000 : 0;
    if (slipBps > 50) {
      anomalies.push({ type: 'HIGH_SLIPPAGE', trade_id: f.trade_id, slippage_bps: slipBps });
    }
  }

  // Drawdown warning
  if (ledger.max_drawdown > 0.05) {
    anomalies.push({ type: 'HIGH_DRAWDOWN', max_drawdown_pct: ledger.max_drawdown * 100 });
  }

  // Fee ratio
  const equity = getEquity(ledger, {});
  const feeRatio = equity > 0 ? ledger.total_fees / equity : 0;
  if (feeRatio > 0.01) {
    anomalies.push({ type: 'HIGH_FEE_RATIO', fee_ratio_pct: feeRatio * 100 });
  }

  return anomalies;
}
