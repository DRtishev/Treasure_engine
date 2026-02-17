#!/usr/bin/env node
// E107 Track 3: Paper-Live Runner
// Run loop: Live Feed → Paper Fills → Ledger → Report
// Kill-switch policy: daily stop, max position, max loss, panic exit (paper)

import { createLedger, recordFill, getLedgerSummary, getEquity, serializeLedger } from '../profit/ledger.mjs';
import { generateDailyReport } from '../../scripts/report/e107_daily_report.mjs';
import { stableFormatNumber } from '../../scripts/verify/foundation_render.mjs';

/**
 * Kill-switch policy configuration
 */
const DEFAULT_RISK_POLICY = {
  max_position_usd: 5000,       // Max position value in USD
  max_daily_loss_pct: 2.0,      // Max daily loss % before halt
  max_total_loss_pct: 5.0,      // Max total loss % before panic exit
  max_drawdown_pct: 3.0,        // Max drawdown % before halt
  max_fills_per_day: 100,       // Max fills per day
  panic_exit_on_error: true     // Panic exit on any error
};

/**
 * Check risk guardrails
 * @param {Object} ledger - Current ledger state
 * @param {Object} prices - Current market prices
 * @param {Object} policy - Risk policy
 * @param {Object} state - Runner state { fills_today, day_start_equity }
 * @returns {{ halt: boolean, reason: string|null, level: string }}
 */
export function checkRiskGuardrails(ledger, prices, policy, state) {
  const equity = getEquity(ledger, prices);
  const summary = getLedgerSummary(ledger, prices);

  // Max fills per day
  if (state.fills_today >= policy.max_fills_per_day) {
    return { halt: true, reason: 'MAX_FILLS_PER_DAY', level: 'WARN' };
  }

  // Daily loss check
  const dayPnlPct = state.day_start_equity > 0
    ? ((equity - state.day_start_equity) / state.day_start_equity) * 100
    : 0;
  if (dayPnlPct < -policy.max_daily_loss_pct) {
    return { halt: true, reason: 'MAX_DAILY_LOSS', level: 'CRITICAL' };
  }

  // Total loss check
  const totalLossPct = ledger.initial_capital > 0
    ? ((ledger.initial_capital - equity) / ledger.initial_capital) * 100
    : 0;
  if (totalLossPct > policy.max_total_loss_pct) {
    return { halt: true, reason: 'MAX_TOTAL_LOSS_PANIC', level: 'PANIC' };
  }

  // Drawdown check
  if (summary.max_drawdown * 100 > policy.max_drawdown_pct) {
    return { halt: true, reason: 'MAX_DRAWDOWN', level: 'CRITICAL' };
  }

  return { halt: false, reason: null, level: 'OK' };
}

/**
 * Simple paper execution model
 * @param {Object} tick - { symbol, price, ... }
 * @param {string} signal - 'BUY' | 'SELL' | 'HOLD'
 * @param {Object} policy - Risk policy
 * @returns {Object|null} Fill object or null
 */
export function paperExecute(tick, signal, policy) {
  if (signal === 'HOLD') return null;

  const slipBps = 2; // 2bps paper slippage
  const feeBps = 4;  // 4bps fee
  const notional = Math.min(policy.max_position_usd * 0.1, 500);
  const qty = notional / tick.price;
  const execPrice = signal === 'BUY'
    ? tick.price * (1 + slipBps / 10000)
    : tick.price * (1 - slipBps / 10000);
  const fee = notional * (feeBps / 10000);

  return {
    symbol: tick.symbol,
    side: signal,
    qty,
    price: tick.price,
    exec_price: execPrice,
    fee,
    ts: tick.ts
  };
}

/**
 * Simple momentum signal generator (deterministic)
 * @param {Array} history - Recent price ticks
 * @returns {string} 'BUY' | 'SELL' | 'HOLD'
 */
export function simpleSignal(history) {
  if (history.length < 3) return 'HOLD';
  const last3 = history.slice(-3);
  const avg = last3.reduce((s, t) => s + t.price, 0) / last3.length;
  const current = last3[last3.length - 1].price;
  if (current > avg * 1.001) return 'BUY';
  if (current < avg * 0.999) return 'SELL';
  return 'HOLD';
}

/**
 * Run paper-live loop
 * @param {Object} feed - Feed interface from core/live/feed.mjs
 * @param {Object} opts - { policy, initial_capital, date, run_id }
 * @returns {Object} { ledger, report, risk_events, status }
 */
export function runPaperLiveLoop(feed, opts = {}) {
  const policy = { ...DEFAULT_RISK_POLICY, ...(opts.policy || {}) };
  const ledger = createLedger({
    initial_capital: opts.initial_capital || 10000,
    created_at: opts.date ? `${opts.date}T00:00:00Z` : '2026-01-01T00:00:00Z'
  });

  const state = {
    fills_today: 0,
    day_start_equity: ledger.initial_capital
  };

  const riskEvents = [];
  const history = [];
  let status = 'COMPLETED';
  let tickCount = 0;

  while (feed.hasMore()) {
    const tick = feed.next();
    if (!tick) break;

    tickCount++;
    history.push(tick);
    if (history.length > 20) history.shift();

    // Check risk guardrails BEFORE trading
    const prices = { [tick.symbol]: tick.price };
    const risk = checkRiskGuardrails(ledger, prices, policy, state);

    if (risk.halt) {
      riskEvents.push({
        tick: tickCount,
        ts: tick.ts,
        reason: risk.reason,
        level: risk.level
      });

      if (risk.level === 'PANIC') {
        status = 'PANIC_EXIT';
        break;
      }

      // Skip trading but continue monitoring
      continue;
    }

    // Generate signal and execute
    const signal = simpleSignal(history);
    const fill = paperExecute(tick, signal, policy);

    if (fill) {
      recordFill(ledger, fill);
      state.fills_today++;
    }
  }

  // Generate report
  const lastTick = history.length > 0 ? history[history.length - 1] : null;
  const prices = lastTick ? { [lastTick.symbol]: lastTick.price } : {};
  const report = generateDailyReport(ledger, prices, {
    date: opts.date || '2026-01-01',
    run_id: opts.run_id || 'E107-PAPER-001'
  });

  return {
    ledger,
    report,
    risk_events: riskEvents,
    status,
    ticks_processed: tickCount,
    fills_count: ledger.fills.length
  };
}
