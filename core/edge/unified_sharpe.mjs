/**
 * unified_sharpe.mjs — SSOT for ALL risk-adjusted performance metrics
 *
 * THREE RULES:
 * 1. Every Sharpe in the system comes from HERE
 * 2. All functions are pure, deterministic, dependency-free
 * 3. No module may define its own Sharpe — import from here
 *
 * Replaces: backtest/engine.mjs inline Sharpe, sim/metrics.mjs equity Sharpe,
 *           edge/overfit_defense.mjs custom DSR
 *
 * References:
 * - Bailey, D.H. & Lopez de Prado, M. (2014) "The Deflated Sharpe Ratio"
 * - Sortino, F. & van der Meer, R. (1991) "Downside risk"
 */

// ---------------------------------------------------------------------------
// Internal: truncateTowardZero (inlined — ZERO external dependencies)
// ---------------------------------------------------------------------------

/**
 * Truncate a number toward zero to `scale` decimal places.
 * Deterministic: no banker's rounding, no floating-point jitter.
 * Inlined from deterministic_math.mjs to maintain zero-dependency guarantee.
 * @param {number} value
 * @param {number} scale - decimal places (e.g. 6)
 * @returns {number}
 */
function truncateTowardZero(value, scale) {
  if (!Number.isFinite(value)) return value; // NaN / ±Infinity pass through
  const factor = 10 ** scale;
  const truncated = value < 0 ? Math.ceil(value * factor) : Math.floor(value * factor);
  return truncated / factor;
}

// ---------------------------------------------------------------------------
// Internal: Normal CDF via error function (Abramowitz & Stegun 7.1.26)
// ---------------------------------------------------------------------------

/**
 * Error function approximation. Maximum error: 1.5e-7.
 * @param {number} x
 * @returns {number}
 */
function erf(x) {
  if (x === 0) return 0;
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return sign * y;
}

/**
 * Standard normal CDF: P(Z <= x).
 * @param {number} x
 * @returns {number}
 */
function normalCDF(x) {
  return 0.5 * (1.0 + erf(x / Math.SQRT2));
}

/**
 * Inverse of the standard normal CDF (Beasley-Springer-Moro rational approximation).
 * @param {number} p — probability in (0, 1)
 * @returns {number}
 */
function normalInvCDF(p) {
  if (p <= 0 || p >= 1) {
    throw new Error(`normalInvCDF: p must be in (0, 1), got ${p}`);
  }
  const a = [
    -3.969683028665376e+01,  2.209460984245205e+02,
    -2.759285104469687e+02,  1.383577518672690e+02,
    -3.066479806614716e+01,  2.506628277459239e+00,
  ];
  const b = [
    -5.447609879822406e+01,  1.615858368580409e+02,
    -1.556989798598866e+02,  6.680131188771972e+01,
    -1.328068155288572e+01,
  ];
  const c = [
    -7.784894002430293e-03, -3.223964580411365e-01,
    -2.400758277161838e+00, -2.549732539343734e+00,
     4.374664141464968e+00,  2.938163982698783e+00,
  ];
  const d = [
     7.784695709041462e-03,  3.224671290700398e-01,
     2.445134137142996e+00,  3.754408661907416e+00,
  ];
  const pLow  = 0.02425;
  const pHigh = 1.0 - pLow;
  let q;
  if (p < pLow) {
    q = Math.sqrt(-2.0 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1.0);
  }
  if (p <= pHigh) {
    q = p - 0.5;
    const r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
           (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1.0);
  }
  q = Math.sqrt(-2.0 * Math.log(1.0 - p));
  return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
          ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1.0);
}

// ===========================================================================
// EXPORTED FUNCTIONS
// ===========================================================================

// ---------------------------------------------------------------------------
// Basic statistics
// ---------------------------------------------------------------------------

/**
 * Arithmetic mean of an array.
 * Returns 0 for empty arrays.
 * @param {number[]} arr
 * @returns {number}
 */
export function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i];
  return sum / arr.length;
}

/**
 * Population variance of an array.
 * Divides by N (not N-1). Returns 0 for empty arrays.
 * @param {number[]} arr
 * @param {number} [m] — precomputed mean (avoids redundant computation)
 * @returns {number}
 */
export function variance(arr, m) {
  if (!arr || arr.length === 0) return 0;
  if (m === undefined) m = mean(arr);
  let sumSq = 0;
  for (let i = 0; i < arr.length; i++) {
    const d = arr[i] - m;
    sumSq += d * d;
  }
  return sumSq / arr.length;
}

/**
 * Sample variance with Bessel's correction.
 * Divides by (N-1). Returns 0 for arrays with fewer than 2 elements.
 * @param {number[]} arr
 * @param {number} [m] — precomputed mean
 * @returns {number}
 */
export function sampleVariance(arr, m) {
  if (!arr || arr.length < 2) return 0;
  if (m === undefined) m = mean(arr);
  let sumSq = 0;
  for (let i = 0; i < arr.length; i++) {
    const d = arr[i] - m;
    sumSq += d * d;
  }
  return sumSq / (arr.length - 1);
}

/**
 * Population standard deviation.
 * Returns 0 for empty arrays.
 * @param {number[]} arr
 * @returns {number}
 */
export function stddev(arr) {
  return Math.sqrt(variance(arr));
}

// ---------------------------------------------------------------------------
// Higher moments
// ---------------------------------------------------------------------------

/**
 * Sample skewness (third standardized moment).
 * Uses population std in the denominator for consistency with moment definition.
 * Returns 0 for arrays with fewer than 3 elements.
 * @param {number[]} returns
 * @returns {number}
 */
export function skewness(returns) {
  if (!returns || returns.length < 3) return 0;
  const n = returns.length;
  const m = mean(returns);
  const s = Math.sqrt(Math.max(variance(returns, m), 1e-18));
  let sum3 = 0;
  for (let i = 0; i < n; i++) {
    const z = (returns[i] - m) / s;
    sum3 += z * z * z;
  }
  return sum3 / n;
}

/**
 * Excess kurtosis (fourth standardized moment minus 3).
 * A normal distribution has excess kurtosis = 0.
 * Returns 0 for arrays with fewer than 4 elements.
 * @param {number[]} returns
 * @returns {number}
 */
export function kurtosisExcess(returns) {
  if (!returns || returns.length < 4) return 0;
  const n = returns.length;
  const m = mean(returns);
  const s = Math.sqrt(Math.max(variance(returns, m), 1e-18));
  let sum4 = 0;
  for (let i = 0; i < n; i++) {
    const z = (returns[i] - m) / s;
    sum4 += z * z * z * z;
  }
  return (sum4 / n) - 3;
}

// ---------------------------------------------------------------------------
// Sharpe ratio — THE ONE FORMULA
// ---------------------------------------------------------------------------

/**
 * Annualized Sharpe ratio.
 *
 * Uses sample standard deviation (Bessel's correction) and annualizes
 * with sqrt(periodsPerYear).
 *
 * Formula: (mean(returns) / sampleStdDev(returns)) * sqrt(periodsPerYear)
 *
 * @param {number[]} returns — array of periodic returns
 * @param {number} [periodsPerYear=252] — trading periods per year
 *        (252 for daily, 12 for monthly, etc.)
 * @returns {number} — annualized Sharpe ratio, 0 if insufficient data
 */
export function annualizedSharpe(returns, periodsPerYear = 252) {
  if (!returns || returns.length < 2) return 0;
  const m = mean(returns);
  const sv = sampleVariance(returns, m);
  const s = Math.sqrt(Math.max(sv, 1e-18));
  return (m / s) * Math.sqrt(periodsPerYear);
}

/**
 * Per-trade Sharpe ratio with deterministic truncation.
 *
 * This is the function backtest/engine.mjs should use.
 * Scales by sqrt(tradeCount) to get a per-sample Sharpe, then truncates
 * to `scale` decimal places for deterministic output.
 *
 * Formula: (mean / popStdDev) * sqrt(N), truncated to `scale` decimals.
 *
 * Note: uses population stddev (not sample) to match the existing backtest
 * convention: the per-trade Sharpe measures the realized information ratio
 * over the observed trade set, not an estimate of a population parameter.
 *
 * @param {number[]} tradeReturns — per-trade return array
 * @param {number} [scale=6] — decimal places for truncation
 * @returns {number} — truncated per-trade Sharpe ratio
 */
export function sharpeFromTrades(tradeReturns, scale = 6) {
  if (!tradeReturns || tradeReturns.length < 2) return 0;
  const m = mean(tradeReturns);
  const v = variance(tradeReturns, m);
  const s = Math.sqrt(Math.max(v, 1e-18));
  if (s <= 0) return 0;
  const raw = (m / s) * Math.sqrt(tradeReturns.length);
  return truncateTowardZero(raw, scale);
}

/**
 * Compute Sharpe ratio from an equity curve (array of equity values).
 *
 * This is the function sim/metrics.mjs should use.
 * Converts equity values to period-over-period returns, then computes
 * annualized Sharpe.
 *
 * @param {number[]} equityCurve — array of equity values (e.g. [10000, 10050, 10020, ...])
 * @param {number} [periodsPerYear=252] — periods per year for annualization
 * @returns {number} — annualized Sharpe ratio, 0 if insufficient data
 */
export function sharpeFromEquityCurve(equityCurve, periodsPerYear = 252) {
  if (!equityCurve || equityCurve.length < 3) return 0;
  const returns = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prev = equityCurve[i - 1];
    if (prev === 0) {
      returns.push(0);
    } else {
      returns.push((equityCurve[i] - prev) / prev);
    }
  }
  return annualizedSharpe(returns, periodsPerYear);
}

// ---------------------------------------------------------------------------
// Deflated Sharpe Ratio (DSR) — Bailey & Lopez de Prado (2014)
// ---------------------------------------------------------------------------

/**
 * Deflated Sharpe Ratio (DSR).
 *
 * Implements the Bailey & Lopez de Prado (2014) correction for
 * multiple testing and non-normality of returns.
 *
 * The standard error of the Sharpe ratio under non-normal returns is:
 *   SE(SR) = sqrt( (1 - skew * SR + ((kurt - 1) / 4) * SR^2) / (n - 1) )
 *
 * The expected maximum Sharpe under the null (SR_0) approximation:
 *   SR_0 = sqrt(V[{SR_k}]) * ((1 - gamma) * Phi^-1(1 - 1/trials) + gamma * Phi^-1(1 - 1/(trials * e)))
 * where gamma is the Euler-Mascheroni constant (~0.5772).
 *
 * The DSR is:
 *   DSR = Phi( (SR - SR_0) / SE(SR) )
 *
 * This gives P(SR > SR_0) — the probability that the observed Sharpe
 * exceeds what we'd expect by chance given the number of trials.
 *
 * Reference:
 *   Bailey, D.H. & Lopez de Prado, M. (2014).
 *   "The Deflated Sharpe Ratio: Correcting for Selection Bias,
 *    Backtest Overfitting, and Non-Normality."
 *   Journal of Portfolio Management, 40(5), 94-107.
 *
 * @param {number} sr — observed Sharpe ratio
 * @param {number} n — number of return observations
 * @param {number} skew — skewness of returns (third moment)
 * @param {number} kurtExcess — excess kurtosis of returns (fourth moment - 3)
 * @param {number} trials — number of independent strategies/trials tested
 * @returns {number} — DSR in [0, 1]: probability that SR is significant
 */
export function deflatedSharpeRatio(sr, n, skew, kurtExcess, trials) {
  if (n < 2 || trials < 1) return 0;

  // Standard error of the Sharpe ratio under non-normality
  // SE(SR) = sqrt( (1 - skew*SR + ((kurtExcess+3-1)/4)*SR^2) / (n-1) )
  //        = sqrt( (1 - skew*SR + ((kurtExcess+2)/4)*SR^2) / (n-1) )
  // Note: kurtExcess = kurt - 3, so kurt = kurtExcess + 3
  //       (kurt - 1)/4 = (kurtExcess + 2)/4
  const se2Numer = 1 - skew * sr + ((kurtExcess + 2) / 4) * sr * sr;
  const seSR = Math.sqrt(Math.max(se2Numer, 1e-18) / Math.max(n - 1, 1));

  // Expected maximum Sharpe under the null hypothesis (SR_0)
  // Uses the Euler-Mascheroni constant for the expected maximum of iid normals
  const gamma = 0.5772156649015329; // Euler-Mascheroni constant
  if (trials <= 1) {
    // No multiple testing correction needed — compare directly to 0
    const z = sr / Math.max(seSR, 1e-18);
    return normalCDF(z);
  }

  // For trials > 1, approximate SR_0 via expected max of `trials` iid N(0,1)
  // SR_0 ≈ (1 - gamma) * Phi^-1(1 - 1/trials) + gamma * Phi^-1(1 - 1/(trials*e))
  const p1 = 1 - 1 / trials;
  const p2 = 1 - 1 / (trials * Math.E);
  // Clamp probabilities to valid range for normalInvCDF
  const p1Clamped = Math.min(Math.max(p1, 1e-10), 1 - 1e-10);
  const p2Clamped = Math.min(Math.max(p2, 1e-10), 1 - 1e-10);
  const sr0 = (1 - gamma) * normalInvCDF(p1Clamped) + gamma * normalInvCDF(p2Clamped);

  // DSR = Phi( (SR - SR_0) / SE(SR) )
  const z = (sr - sr0) / Math.max(seSR, 1e-18);
  return normalCDF(z);
}

// ---------------------------------------------------------------------------
// Sortino ratio
// ---------------------------------------------------------------------------

/**
 * Sortino ratio: return over downside deviation.
 *
 * Unlike Sharpe which penalizes all volatility equally, Sortino only
 * penalizes returns below a target (downside risk).
 *
 * Formula: (mean(returns) - targetReturn) / downsideDeviation
 * where downsideDeviation = sqrt(mean(min(returns - target, 0)^2))
 *
 * @param {number[]} returns — array of periodic returns
 * @param {number} [targetReturn=0] — minimum acceptable return
 * @returns {number} — Sortino ratio, 0 if insufficient data or zero downside dev
 */
export function sortino(returns, targetReturn = 0) {
  if (!returns || returns.length < 2) return 0;
  const m = mean(returns);
  let downsideSumSq = 0;
  let countBelow = 0;
  for (let i = 0; i < returns.length; i++) {
    const diff = returns[i] - targetReturn;
    if (diff < 0) {
      downsideSumSq += diff * diff;
      countBelow++;
    }
  }
  // Use full N in denominator (continuous downside deviation definition)
  const downsideDev = Math.sqrt(downsideSumSq / returns.length);
  if (downsideDev < 1e-18) return 0;
  return (m - targetReturn) / downsideDev;
}

// ---------------------------------------------------------------------------
// Calmar ratio
// ---------------------------------------------------------------------------

/**
 * Calmar ratio: annualized return divided by maximum drawdown.
 *
 * @param {number} annualizedReturn — annualized return (e.g. 0.12 for 12%)
 * @param {number} maxDrawdown — maximum drawdown as a positive fraction (e.g. 0.15 for 15%)
 * @returns {number} — Calmar ratio, 0 if maxDrawdown is zero or negative
 */
export function calmar(annualizedReturn, maxDrawdown) {
  if (!Number.isFinite(annualizedReturn) || !Number.isFinite(maxDrawdown)) return 0;
  if (maxDrawdown <= 1e-18) return 0;
  return annualizedReturn / maxDrawdown;
}

// ---------------------------------------------------------------------------
// Ulcer Index
// ---------------------------------------------------------------------------

/**
 * Ulcer Index: sqrt(mean(drawdown^2)).
 *
 * Measures the depth and duration of drawdowns. Lower is better.
 * Input is a series of drawdown values (as positive fractions).
 *
 * @param {number[]} drawdownSeries — array of drawdown values (e.g. [0, 0.01, 0.03, 0.02, 0])
 * @returns {number} — Ulcer Index, 0 for empty input
 */
export function ulcerIndex(drawdownSeries) {
  if (!drawdownSeries || drawdownSeries.length === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < drawdownSeries.length; i++) {
    sumSq += drawdownSeries[i] * drawdownSeries[i];
  }
  return Math.sqrt(sumSq / drawdownSeries.length);
}

// ---------------------------------------------------------------------------
// Pain Ratio
// ---------------------------------------------------------------------------

/**
 * Pain Ratio: annualized return divided by Ulcer Index.
 *
 * Higher is better — measures return earned per unit of "pain" (drawdown severity).
 *
 * @param {number} annualizedReturn — annualized return
 * @param {number} ulcerIdx — Ulcer Index value
 * @returns {number} — Pain ratio, 0 if ulcerIdx is zero or negative
 */
export function painRatio(annualizedReturn, ulcerIdx) {
  if (!Number.isFinite(annualizedReturn) || !Number.isFinite(ulcerIdx)) return 0;
  if (ulcerIdx <= 1e-18) return 0;
  return annualizedReturn / ulcerIdx;
}
