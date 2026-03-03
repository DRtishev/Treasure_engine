/**
 * monte_carlo.mjs — Monte Carlo Stress World Generator
 *
 * N parallel universes via block bootstrap resampling.
 * Deterministic: seeded PRNG guarantees reproducible results.
 *
 * Instead of "this backtest made 15%", produces:
 *   P(ruin) = 3%
 *   P(positive) = 87%
 *   VaR_95 = -$423
 *   Sharpe 5th percentile = 0.3
 *
 * ZERO external dependencies. Pure, deterministic.
 */

import { truncateTowardZero } from './deterministic_math.mjs';

/**
 * Seeded PRNG (Mulberry32) — deterministic random number generator.
 * @param {number} seed
 * @returns {function(): number} — returns [0, 1)
 */
export function createSeededRNG(seed) {
  // Mulberry32 implementation
  let state = seed | 0;
  return function() {
    state |= 0; state = state + 0x6D2B79F5 | 0;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Block bootstrap resampling — preserves autocorrelation structure.
 * Draws random blocks of consecutive bars from the original series
 * and concatenates them until the resampled series reaches the
 * same length as the input. This preserves short-range serial
 * correlation (momentum, mean-reversion clusters) that i.i.d.
 * resampling would destroy.
 *
 * @param {Array} bars — original OHLCV bars
 * @param {number} blockSize — block length for resampling
 * @param {function} rng — seeded RNG function
 * @returns {Array} — resampled bars array (same length as input)
 */
export function blockBootstrap(bars, blockSize, rng) {
  if (!bars || bars.length === 0) return [];
  if (blockSize < 1) blockSize = 1;
  const n = bars.length;
  const result = [];

  while (result.length < n) {
    // Pick a random start index in [0, n - 1]
    const start = Math.floor(rng() * n);
    for (let j = 0; j < blockSize && result.length < n; j++) {
      // Wrap around if the block extends past the end
      const idx = (start + j) % n;
      // Shallow-copy the bar so mutations in the backtest
      // engine never leak back into the source array
      result.push({ ...bars[idx] });
    }
  }

  return result;
}

/**
 * Compute percentiles from an array of values.
 * Uses the linear interpolation method (same as NumPy default).
 *
 * @param {number[]} values
 * @param {number[]} pcts — e.g. [5, 25, 50, 75, 95]
 * @returns {Object} — { p5: ..., p25: ..., ... }
 */
export function percentiles(values, pcts) {
  if (!values || values.length === 0) {
    const out = {};
    for (const p of pcts) out[`p${p}`] = 0;
    return out;
  }

  // Sort ascending (numeric)
  const sorted = values.slice().sort((a, b) => a - b);
  const n = sorted.length;
  const out = {};

  for (const p of pcts) {
    // Rank position (0-indexed) for the given percentile
    const rank = (p / 100) * (n - 1);
    const lo = Math.floor(rank);
    const hi = Math.ceil(rank);
    const frac = rank - lo;

    if (lo === hi || hi >= n) {
      out[`p${p}`] = sorted[Math.min(lo, n - 1)];
    } else {
      // Linear interpolation between the two nearest ranks
      out[`p${p}`] = sorted[lo] + frac * (sorted[hi] - sorted[lo]);
    }
  }

  return out;
}

/**
 * Conditional VaR (Expected Shortfall) at a given quantile.
 * CVaR_alpha = mean of the worst alpha-fraction of outcomes.
 * e.g. alpha=0.05 → average of the worst 5% of PnL values.
 *
 * @param {number[]} values — PnL values
 * @param {number} alpha — e.g. 0.05 for CVaR_95
 * @returns {number}
 */
export function conditionalVaR(values, alpha) {
  if (!values || values.length === 0) return 0;
  if (alpha <= 0 || alpha >= 1) return 0;

  const sorted = values.slice().sort((a, b) => a - b);
  // Number of observations in the tail
  const cutoff = Math.max(1, Math.floor(sorted.length * alpha));
  const tail = sorted.slice(0, cutoff);
  const sum = tail.reduce((acc, v) => acc + v, 0);
  return sum / tail.length;
}

/**
 * Run Monte Carlo backtest simulation.
 *
 * For each of N simulations, resamples the input bars via block
 * bootstrap and runs the full backtest. Aggregates the distribution
 * of key metrics (Sharpe, return, max drawdown) and derives
 * probability-of-ruin, probability-of-positive-return, VaR, CVaR,
 * and an overall verdict.
 *
 * @param {function} runBacktestFn — the runBacktest function to use
 * @param {Object} strategy — strategy object
 * @param {Array} bars — original OHLCV bars
 * @param {Object} opts — backtest options
 * @param {Object} [mcOpts]
 * @param {number} [mcOpts.N=500] — number of simulations
 * @param {number} [mcOpts.seed=42] — PRNG seed
 * @param {number} [mcOpts.blockSize] — bootstrap block size (default: sqrt(bars.length))
 * @param {number} [mcOpts.ruinThreshold=0.5] — max DD threshold for "ruin"
 * @param {number} [mcOpts.scale=6] — truncation scale
 * @returns {{
 *   simulations: number,
 *   seed: number,
 *   sharpe_dist: Object,
 *   return_dist: Object,
 *   dd_dist: Object,
 *   p_ruin: number,
 *   p_positive: number,
 *   VaR_95: number,
 *   CVaR_95: number,
 *   median_sharpe: number,
 *   verdict: string,
 *   reason: string
 * }}
 */
export function monteCarloBacktest(runBacktestFn, strategy, bars, opts, mcOpts = {}) {
  const N              = mcOpts.N              || 500;
  const seed           = mcOpts.seed           || 42;
  const ruinThreshold  = mcOpts.ruinThreshold  != null ? mcOpts.ruinThreshold : 0.5;
  const scale          = mcOpts.scale          != null ? mcOpts.scale : 6;
  const blockSize      = mcOpts.blockSize      || Math.max(1, Math.floor(Math.sqrt(bars.length)));

  const rng = createSeededRNG(seed);

  const sharpes  = [];
  const returns  = [];
  const drawdowns = [];

  for (let i = 0; i < N; i++) {
    const resampled = blockBootstrap(bars, blockSize, rng);
    const result    = runBacktestFn(strategy, resampled, opts);
    const m         = result.metrics;

    sharpes.push(m.backtest_sharpe   || 0);
    returns.push(m.return_pct        || 0);
    drawdowns.push(m.max_drawdown    || 0);
  }

  // Distribution summaries
  const pctLevels  = [5, 25, 50, 75, 95];
  const sharpe_dist = percentiles(sharpes,   pctLevels);
  const return_dist = percentiles(returns,   pctLevels);
  const dd_dist     = percentiles(drawdowns, pctLevels);

  // Probability of ruin: fraction of simulations where max drawdown >= threshold
  const ruinCount    = drawdowns.filter(dd => dd >= ruinThreshold).length;
  const p_ruin       = truncateTowardZero(ruinCount / N, scale);

  // Probability of positive return
  const positiveCount = returns.filter(r => r > 0).length;
  const p_positive    = truncateTowardZero(positiveCount / N, scale);

  // VaR at 95% confidence = 5th percentile of returns
  const VaR_95 = truncateTowardZero(return_dist.p5, scale);

  // CVaR (Expected Shortfall) at 95% confidence
  const CVaR_95 = truncateTowardZero(conditionalVaR(returns, 0.05), scale);

  // Median Sharpe
  const median_sharpe = truncateTowardZero(sharpe_dist.p50, scale);

  // Truncate distribution values
  for (const key of Object.keys(sharpe_dist)) {
    sharpe_dist[key] = truncateTowardZero(sharpe_dist[key], scale);
  }
  for (const key of Object.keys(return_dist)) {
    return_dist[key] = truncateTowardZero(return_dist[key], scale);
  }
  for (const key of Object.keys(dd_dist)) {
    dd_dist[key] = truncateTowardZero(dd_dist[key], scale);
  }

  // ── Verdict logic ──
  let verdict, reason;

  if (p_ruin > 0.10) {
    verdict = 'BLOCKED';
    reason  = 'MC_RUIN_HIGH';
  } else if (p_ruin > 0.05) {
    verdict = 'FAIL';
    reason  = 'MC_RUIN_ELEVATED';
  } else if (p_positive < 0.70) {
    verdict = 'FAIL';
    reason  = 'MC_NEGATIVE_DOMINANT';
  } else if (p_positive < 0.80) {
    verdict = 'WARN';
    reason  = 'MC_UNCERTAIN';
  } else if (median_sharpe < 0) {
    verdict = 'FAIL';
    reason  = 'MC_SHARPE_NEGATIVE';
  } else {
    verdict = 'PASS';
    reason  = 'MC_PASS';
  }

  return {
    simulations: N,
    seed,
    sharpe_dist,
    return_dist,
    dd_dist,
    p_ruin,
    p_positive,
    VaR_95,
    CVaR_95,
    median_sharpe,
    verdict,
    reason,
  };
}
