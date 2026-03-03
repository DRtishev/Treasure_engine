/**
 * alpha_attribution.mjs — Alpha Autopsy: Profit Attribution Engine
 *
 * Decomposes strategy return into:
 *   market_beta    — buy-and-hold baseline
 *   timing_alpha   — entry/exit timing vs random
 *   execution_cost — fees + slippage drag
 *   pure_alpha     — unexplained skill
 *
 * "This strategy earned 15%" is useless.
 * "8% beta + 5% timing + 3% skill - 1% costs = 15%" is INFORMATION.
 *
 * ZERO external dependencies. Pure, deterministic.
 */

import { truncateTowardZero } from './deterministic_math.mjs';

/**
 * Compute buy-and-hold return for the bar series.
 * @param {Array} bars — OHLCV bars
 * @returns {number} — return percentage
 */
export function buyAndHoldReturn(bars) {
  if (!bars || bars.length < 2) return 0;
  const first = bars[0];
  const last = bars[bars.length - 1];
  const openPrice = Number(first.open ?? first.o ?? first.price ?? 0);
  const closePrice = Number(last.close ?? last.c ?? last.price ?? 0);
  if (!Number.isFinite(openPrice) || !Number.isFinite(closePrice) || openPrice === 0) return 0;
  return (closePrice - openPrice) / openPrice;
}

/**
 * Compute the average price across all bars (using close prices).
 * @param {Array} bars — OHLCV bars
 * @returns {number}
 */
function averageBarPrice(bars) {
  if (!bars || bars.length === 0) return 0;
  let sum = 0;
  let count = 0;
  for (const bar of bars) {
    const close = Number(bar.close ?? bar.c ?? bar.price ?? 0);
    if (Number.isFinite(close) && close > 0) {
      sum += close;
      count += 1;
    }
  }
  return count > 0 ? sum / count : 0;
}

/**
 * Compute timing alpha — how much value entry/exit timing added vs random.
 * Uses average trade entry/exit prices vs average bar prices.
 * @param {Array} signals — from runBacktest result
 * @param {Array} bars — OHLCV bars
 * @returns {number} — timing alpha percentage
 */
export function computeTimingAlpha(signals, bars) {
  if (!signals || signals.length === 0 || !bars || bars.length === 0) return 0;

  const avgBarPrice = averageBarPrice(bars);
  if (avgBarPrice === 0) return 0;

  let entrySum = 0;
  let exitSum = 0;
  let entryCount = 0;
  let exitCount = 0;

  for (const sig of signals) {
    // Support explicit entry_price/exit_price fields
    const entryPrice = Number(sig.entry_price ?? sig.entryPrice ?? sig.entry ?? 0);
    const exitPrice = Number(sig.exit_price ?? sig.exitPrice ?? sig.exit ?? 0);

    if (Number.isFinite(entryPrice) && entryPrice > 0) {
      entrySum += entryPrice;
      entryCount += 1;
    }
    if (Number.isFinite(exitPrice) && exitPrice > 0) {
      exitSum += exitPrice;
      exitCount += 1;
    }

    // Support backtest engine signal shape: { signal: 'BUY'|'SELL', price }
    if (entryPrice === 0 && exitPrice === 0 && sig.signal && sig.price) {
      const p = Number(sig.price);
      if (Number.isFinite(p) && p > 0) {
        if (sig.signal === 'BUY') {
          entrySum += p;
          entryCount += 1;
        } else if (sig.signal === 'SELL') {
          exitSum += p;
          exitCount += 1;
        }
      }
    }
  }

  if (entryCount === 0 || exitCount === 0) return 0;

  const avgEntry = entrySum / entryCount;
  const avgExit = exitSum / exitCount;

  // Timing alpha: how much better our entry/exit was vs random (buying/selling at average bar price)
  const randomReturn = 0; // buying and selling at average bar price yields ~0
  const timingReturn = (avgExit - avgEntry) / avgEntry;
  const randomBaseline = (avgBarPrice - avgBarPrice) / avgBarPrice; // 0

  return timingReturn - randomBaseline;
}

/**
 * Extract total execution costs (fees + slippage) from backtest result.
 * @param {Object} backtestResult
 * @returns {number} — execution cost as fraction of capital
 */
function extractExecutionCost(backtestResult) {
  // Try common backtest result shapes
  const totalFees = Number(backtestResult.total_fees ?? backtestResult.fees ?? backtestResult.totalFees ?? 0);
  const totalSlippage = Number(backtestResult.total_slippage ?? backtestResult.slippage ?? backtestResult.totalSlippage ?? 0);
  const initialCapital = Number(
    backtestResult.initial_capital ?? backtestResult.initialCapital ?? backtestResult.starting_capital ?? 0
  );

  const cost = (Number.isFinite(totalFees) ? totalFees : 0) + (Number.isFinite(totalSlippage) ? totalSlippage : 0);
  if (!Number.isFinite(cost) || cost === 0) return 0;

  // If we have initial capital, express cost as fraction
  if (Number.isFinite(initialCapital) && initialCapital > 0) {
    return cost / initialCapital;
  }

  // Fallback: cost might already be expressed as a fraction
  return Number.isFinite(cost) ? cost : 0;
}

/**
 * Extract total strategy return from backtest result.
 * @param {Object} backtestResult
 * @returns {number}
 */
function extractTotalReturn(backtestResult) {
  // return_pct from engine.mjs is in percentage (e.g. 15 for 15%), convert to fraction
  if (backtestResult.return_pct != null && Number.isFinite(Number(backtestResult.return_pct))) {
    return Number(backtestResult.return_pct) / 100;
  }
  const ret = Number(
    backtestResult.total_return ?? backtestResult.totalReturn ??
    backtestResult.return ?? backtestResult.pnl_pct ?? 0
  );
  return Number.isFinite(ret) ? ret : 0;
}

/**
 * Extract signals/trades from backtest result.
 * @param {Object} backtestResult
 * @returns {Array}
 */
function extractSignals(backtestResult) {
  return backtestResult.signals ?? backtestResult.trades ?? backtestResult.fills ?? [];
}

/**
 * Compute standard deviation of an array.
 * @param {number[]} arr
 * @returns {number}
 */
function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

/**
 * Full alpha attribution decomposition.
 * @param {Object} backtestResult — from runBacktest()
 * @param {Array} bars — OHLCV bars
 * @param {Object} [opts]
 * @param {number} [opts.scale=6] — truncation scale
 * @returns {{
 *   total_return: number,
 *   market_beta: number,
 *   timing_alpha: number,
 *   execution_cost: number,
 *   pure_alpha: number,
 *   alpha_ratio: number,
 *   information_ratio: number,
 *   verdict: string,
 *   reason: string
 * }}
 */
export function attributeAlpha(backtestResult, bars, opts = {}) {
  const scale = Number.isFinite(opts.scale) ? opts.scale : 6;

  const total_return = truncateTowardZero(extractTotalReturn(backtestResult), scale);
  const market_beta = truncateTowardZero(buyAndHoldReturn(bars), scale);

  const signals = extractSignals(backtestResult);
  const timing_alpha = truncateTowardZero(computeTimingAlpha(signals, bars), scale);

  const execution_cost = truncateTowardZero(Math.abs(extractExecutionCost(backtestResult)), scale);

  // pure_alpha = total - beta - timing + costs (costs are drag, so they reduce total)
  const pure_alpha = truncateTowardZero(
    total_return - market_beta - timing_alpha + execution_cost,
    scale
  );

  // alpha_ratio: fraction of total return attributable to skill (timing + pure) vs beta
  const skillReturn = timing_alpha + pure_alpha;
  const alpha_ratio = total_return !== 0
    ? truncateTowardZero(skillReturn / Math.abs(total_return), scale)
    : 0;

  // information_ratio: excess return per unit of tracking error
  // Approximate tracking error from bar-level returns vs strategy returns
  let information_ratio = 0;
  const returns = backtestResult.returns ?? backtestResult.bar_returns ?? [];
  if (Array.isArray(returns) && returns.length > 1) {
    const barReturns = [];
    for (let i = 1; i < bars.length; i++) {
      const prevClose = Number(bars[i - 1].close ?? bars[i - 1].c ?? 0);
      const curClose = Number(bars[i].close ?? bars[i].c ?? 0);
      if (prevClose > 0) barReturns.push((curClose - prevClose) / prevClose);
    }
    const minLen = Math.min(returns.length, barReturns.length);
    if (minLen > 1) {
      const diffs = [];
      for (let i = 0; i < minLen; i++) {
        diffs.push((Number(returns[i]) || 0) - (barReturns[i] || 0));
      }
      const te = stddev(diffs);
      const excessReturn = total_return - market_beta;
      information_ratio = te > 1e-12
        ? truncateTowardZero(excessReturn / te, scale)
        : 0;
    }
  }

  // Verdict logic
  let verdict;
  let reason;
  if (alpha_ratio < -0.5) {
    verdict = 'FAIL';
    reason = 'ALPHA_STRONGLY_NEGATIVE';
  } else if (alpha_ratio < 0) {
    verdict = 'WARN';
    reason = 'ALPHA_NEGATIVE';
  } else if (alpha_ratio < 0.1) {
    verdict = 'WARN';
    reason = 'ALPHA_MARGINAL';
  } else {
    verdict = 'PASS';
    reason = 'ALPHA_POSITIVE';
  }

  return {
    total_return,
    market_beta,
    timing_alpha,
    execution_cost,
    pure_alpha,
    alpha_ratio,
    information_ratio,
    verdict,
    reason
  };
}
