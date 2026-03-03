/**
 * bayesian_sharpe.mjs — Bayesian posterior estimation of Sharpe ratio
 *
 * Instead of "Sharpe = 1.5", produces:
 *   P(Sharpe > 0) = 0.93
 *   95% CI: [0.8, 2.1]
 *   posterior_mean: 1.45
 *   posterior_std: 0.33
 *
 * Uses conjugate Normal-Normal model with uninformative prior.
 *
 * ZERO external dependencies. Pure, deterministic.
 */

import { truncateTowardZero } from './deterministic_math.mjs';

// ---------------------------------------------------------------------------
// Error function (erf) approximation — Abramowitz & Stegun 7.1.26
// ---------------------------------------------------------------------------

/**
 * Compute the error function erf(x) using the Abramowitz & Stegun 7.1.26
 * polynomial approximation. Maximum error: 1.5e-7.
 * @param {number} x
 * @returns {number}
 */
export function erf(x) {
  // erf(0) = 0 exactly
  if (x === 0) return 0;

  // Constants from A&S 7.1.26
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  // Save the sign of x
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);

  // A&S formula 7.1.26
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return sign * y;
}

// ---------------------------------------------------------------------------
// Standard normal CDF
// ---------------------------------------------------------------------------

/**
 * Standard normal cumulative distribution function.
 * @param {number} x
 * @returns {number}
 */
export function normalCDF(x) {
  return 0.5 * (1.0 + erf(x / Math.SQRT2));
}

// ---------------------------------------------------------------------------
// Inverse normal CDF (rational approximation, Beasley-Springer-Moro)
// ---------------------------------------------------------------------------

/**
 * Inverse of the standard normal CDF using the Beasley-Springer-Moro
 * rational approximation.
 * @param {number} p — probability in (0, 1)
 * @returns {number}
 */
export function normalInvCDF(p) {
  if (p <= 0 || p >= 1) {
    throw new Error(`normalInvCDF: p must be in (0, 1), got ${p}`);
  }

  // Rational approximation coefficients (Beasley-Springer-Moro)
  const a = [
    -3.969683028665376e+01,
     2.209460984245205e+02,
    -2.759285104469687e+02,
     1.383577518672690e+02,
    -3.066479806614716e+01,
     2.506628277459239e+00,
  ];

  const b = [
    -5.447609879822406e+01,
     1.615858368580409e+02,
    -1.556989798598866e+02,
     6.680131188771972e+01,
    -1.328068155288572e+01,
  ];

  const c = [
    -7.784894002430293e-03,
    -3.223964580411365e-01,
    -2.400758277161838e+00,
    -2.549732539343734e+00,
     4.374664141464968e+00,
     2.938163982698783e+00,
  ];

  const d = [
     7.784695709041462e-03,
     3.224671290700398e-01,
     2.445134137142996e+00,
     3.754408661907416e+00,
  ];

  const pLow  = 0.02425;
  const pHigh = 1.0 - pLow;

  let q, r;

  if (p < pLow) {
    // Rational approximation for lower region
    q = Math.sqrt(-2.0 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1.0);
  }

  if (p <= pHigh) {
    // Rational approximation for central region
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
           (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1.0);
  }

  // Rational approximation for upper region
  q = Math.sqrt(-2.0 * Math.log(1.0 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
          ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1.0);
}

// ---------------------------------------------------------------------------
// Bayesian Sharpe estimation (conjugate Normal-Normal model)
// ---------------------------------------------------------------------------

/**
 * Compute Bayesian posterior of Sharpe ratio using conjugate Normal-Normal model.
 *
 * The observed Sharpe ratio (mean / std of returns) is treated as a noisy
 * observation of the true Sharpe. Under a Normal-Normal conjugate model:
 *
 *   prior:      Sharpe ~ N(prior_mean, prior_var)
 *   likelihood: observed_sharpe | Sharpe ~ N(Sharpe, se^2)
 *   posterior:  Sharpe | data ~ N(posterior_mean, posterior_var)
 *
 * where se = 1 / sqrt(n) is the standard error of the Sharpe estimate.
 *
 * @param {number[]} returns — array of per-period returns
 * @param {object} [opts]
 * @param {number} [opts.prior_mean=0] — prior mean for Sharpe
 * @param {number} [opts.prior_var=1] — prior variance for Sharpe
 * @param {number} [opts.confidence=0.95] — CI level
 * @param {number} [opts.scale=6] — truncation scale for deterministic output
 * @returns {{ posterior_mean: number, posterior_std: number, p_positive: number,
 *             ci_lower: number, ci_upper: number, n: number, verdict: string,
 *             reason: string }}
 */
export function bayesianSharpe(returns, opts = {}) {
  const {
    prior_mean = 0,
    prior_var  = 1,
    confidence = 0.95,
    scale      = 6,
  } = opts;

  const n = returns.length;

  if (n < 2) {
    return {
      posterior_mean: truncateTowardZero(prior_mean, scale),
      posterior_std:  truncateTowardZero(Math.sqrt(prior_var), scale),
      p_positive:    truncateTowardZero(1.0 - normalCDF(-prior_mean / Math.sqrt(prior_var)), scale),
      ci_lower:      truncateTowardZero(prior_mean - normalInvCDF(0.5 + confidence / 2) * Math.sqrt(prior_var), scale),
      ci_upper:      truncateTowardZero(prior_mean + normalInvCDF(0.5 + confidence / 2) * Math.sqrt(prior_var), scale),
      n,
      verdict:       'NEEDS_DATA',
      reason:        'BAYESIAN_WIDE_CI',
    };
  }

  // --- Compute sample statistics ---
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += returns[i];
  }
  const mean = sum / n;

  let sumSqDev = 0;
  for (let i = 0; i < n; i++) {
    const dev = returns[i] - mean;
    sumSqDev += dev * dev;
  }
  // Use sample std (Bessel's correction)
  const variance = sumSqDev / (n - 1);
  const std = Math.sqrt(variance);

  // Handle zero-variance edge case
  if (std === 0) {
    // All returns identical — Sharpe is undefined in classical sense.
    // If mean > 0 the strategy always wins; if mean <= 0 it never does.
    const observedSharpe = mean > 0 ? Infinity : (mean < 0 ? -Infinity : 0);
    // Fall back to prior since the likelihood is degenerate.
    if (!Number.isFinite(observedSharpe)) {
      const verdict = mean > 0 ? 'PASS' : 'BLOCKED';
      const reason  = mean > 0 ? 'BAYESIAN_DEGENERATE_POSITIVE' : 'BAYESIAN_NEGATIVE';
      return {
        posterior_mean: truncateTowardZero(prior_mean, scale),
        posterior_std:  truncateTowardZero(Math.sqrt(prior_var), scale),
        p_positive:     mean > 0 ? 1.0 : 0.0,
        ci_lower:       truncateTowardZero(prior_mean - normalInvCDF(0.5 + confidence / 2) * Math.sqrt(prior_var), scale),
        ci_upper:       truncateTowardZero(prior_mean + normalInvCDF(0.5 + confidence / 2) * Math.sqrt(prior_var), scale),
        n,
        verdict,
        reason,
      };
    }
    // mean === 0, std === 0 — all zeros
    return {
      posterior_mean: truncateTowardZero(prior_mean, scale),
      posterior_std:  truncateTowardZero(Math.sqrt(prior_var), scale),
      p_positive:    truncateTowardZero(1.0 - normalCDF(-prior_mean / Math.sqrt(prior_var)), scale),
      ci_lower:      truncateTowardZero(prior_mean - normalInvCDF(0.5 + confidence / 2) * Math.sqrt(prior_var), scale),
      ci_upper:      truncateTowardZero(prior_mean + normalInvCDF(0.5 + confidence / 2) * Math.sqrt(prior_var), scale),
      n,
      verdict:       'NEEDS_DATA',
      reason:        'BAYESIAN_WIDE_CI',
    };
  }

  // --- Observed Sharpe ratio ---
  const observedSharpe = mean / std;

  // --- Standard error of Sharpe estimate ---
  // SE(Sharpe) ≈ sqrt((1 + 0.5 * Sharpe^2) / n) (Lo 2002)
  const seSharpe = Math.sqrt((1.0 + 0.5 * observedSharpe * observedSharpe) / n);

  // --- Conjugate Normal-Normal update ---
  // Prior:      N(prior_mean, prior_var)
  // Likelihood: N(observedSharpe, seSharpe^2)
  // Posterior:  N(posterior_mean, posterior_var)

  const likelihoodPrecision = 1.0 / (seSharpe * seSharpe);
  const priorPrecision      = 1.0 / prior_var;
  const posteriorPrecision  = priorPrecision + likelihoodPrecision;
  const posteriorVar        = 1.0 / posteriorPrecision;
  const posteriorMean       = posteriorVar * (priorPrecision * prior_mean + likelihoodPrecision * observedSharpe);
  const posteriorStd        = Math.sqrt(posteriorVar);

  // --- P(Sharpe > 0) ---
  const pPositive = 1.0 - normalCDF(-posteriorMean / posteriorStd);

  // --- Credible interval ---
  const alpha   = 1.0 - confidence;
  const zLower  = normalInvCDF(alpha / 2);
  const zUpper  = normalInvCDF(1.0 - alpha / 2);
  const ciLower = posteriorMean + zLower * posteriorStd;
  const ciUpper = posteriorMean + zUpper * posteriorStd;
  const ciWidth = ciUpper - ciLower;

  // --- Verdict logic ---
  let verdict, reason;
  if (pPositive < 0.5) {
    verdict = 'BLOCKED';
    reason  = 'BAYESIAN_NEGATIVE';
  } else if (pPositive < 0.7) {
    verdict = 'FAIL';
    reason  = 'BAYESIAN_WEAK';
  } else if (pPositive < 0.85) {
    verdict = 'WARN';
    reason  = 'BAYESIAN_UNCERTAIN';
  } else if (ciWidth > 2.0) {
    verdict = 'NEEDS_DATA';
    reason  = 'BAYESIAN_WIDE_CI';
  } else {
    verdict = 'PASS';
    reason  = 'BAYESIAN_CONFIDENT';
  }

  return {
    posterior_mean: truncateTowardZero(posteriorMean, scale),
    posterior_std:  truncateTowardZero(posteriorStd, scale),
    p_positive:     truncateTowardZero(pPositive, scale),
    ci_lower:       truncateTowardZero(ciLower, scale),
    ci_upper:       truncateTowardZero(ciUpper, scale),
    n,
    verdict,
    reason,
  };
}

// ---------------------------------------------------------------------------
// Multi-strategy ranking
// ---------------------------------------------------------------------------

/**
 * Run Bayesian analysis on multiple strategies, rank by P(sharpe > 0).
 * @param {Array<{id: string, returns: number[]}>} strategies
 * @param {object} [opts] — forwarded to bayesianSharpe
 * @returns {{ rankings: Array<{id: string, posterior_mean: number, p_positive: number, verdict: string}>,
 *             best_id: string }}
 */
export function bayesianStrategyRank(strategies, opts = {}) {
  if (!Array.isArray(strategies) || strategies.length === 0) {
    return { rankings: [], best_id: '' };
  }

  const results = strategies.map((s) => {
    const analysis = bayesianSharpe(s.returns, opts);
    return {
      id:             s.id,
      posterior_mean: analysis.posterior_mean,
      p_positive:     analysis.p_positive,
      verdict:        analysis.verdict,
    };
  });

  // Sort descending by p_positive, then by posterior_mean as tiebreaker
  results.sort((a, b) => {
    if (b.p_positive !== a.p_positive) return b.p_positive - a.p_positive;
    return b.posterior_mean - a.posterior_mean;
  });

  return {
    rankings: results,
    best_id:  results[0].id,
  };
}
