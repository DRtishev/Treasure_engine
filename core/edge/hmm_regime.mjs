/**
 * hmm_regime.mjs — Hidden Markov Model Regime Detector
 *
 * Replaces fixed-threshold regime detection with learned regime boundaries.
 * Uses Baum-Welch (EM) for parameter estimation.
 *
 * States: LOW_VOL(0), NORMAL(1), HIGH_VOL(2), CRISIS(3)
 * Observations: log returns
 * Output: per-bar state probabilities, transition matrix, regime change probability
 *
 * ZERO external dependencies. Pure, deterministic.
 */

import { truncateTowardZero } from './deterministic_math.mjs';

// State name mapping
const STATE_NAMES = ['LOW_VOL', 'NORMAL', 'HIGH_VOL', 'CRISIS'];

// ---------------------------------------------------------------------------
// Gaussian PDF
// ---------------------------------------------------------------------------

/**
 * Gaussian PDF for emission probability.
 * @param {number} x — observation value
 * @param {number} mean — distribution mean
 * @param {number} variance — distribution variance
 * @returns {number} — probability density
 */
function gaussianPdf(x, mean, variance) {
  if (variance <= 0) return 0;
  const diff = x - mean;
  const exponent = -(diff * diff) / (2 * variance);
  return (1.0 / Math.sqrt(2 * Math.PI * variance)) * Math.exp(exponent);
}

// ---------------------------------------------------------------------------
// Parameter Initialization
// ---------------------------------------------------------------------------

/**
 * Initialize HMM parameters with heuristic starting points.
 * @param {number[]} returns — log return observations
 * @param {number} nStates — number of hidden states
 * @returns {{ pi: number[], A: number[][], means: number[], variances: number[] }}
 */
function initializeParams(returns, nStates) {
  // Sort returns into quantiles for initial means
  const sorted = returns.slice().sort((a, b) => a - b);
  const n = sorted.length;

  const means = [];
  const variances = [];

  for (let s = 0; s < nStates; s++) {
    // Pick quantile center for each state
    const qStart = Math.floor((s / nStates) * n);
    const qEnd = Math.floor(((s + 1) / nStates) * n);
    const slice = sorted.slice(qStart, Math.max(qEnd, qStart + 1));

    let sum = 0;
    for (let i = 0; i < slice.length; i++) sum += slice[i];
    const mean = sum / slice.length;

    let sumSqDev = 0;
    for (let i = 0; i < slice.length; i++) {
      const dev = slice[i] - mean;
      sumSqDev += dev * dev;
    }
    const variance = slice.length > 1 ? sumSqDev / (slice.length - 1) : 1e-6;

    means.push(mean);
    variances.push(Math.max(variance, 1e-10));
  }

  // Set initial transition matrix to favor staying in same state (0.7 diagonal)
  const A = [];
  for (let i = 0; i < nStates; i++) {
    const row = [];
    const offDiag = 0.3 / (nStates - 1);
    for (let j = 0; j < nStates; j++) {
      row.push(i === j ? 0.7 : offDiag);
    }
    A.push(row);
  }

  // Uniform initial state distribution
  const pi = [];
  for (let s = 0; s < nStates; s++) {
    pi.push(1.0 / nStates);
  }

  return { pi, A, means, variances };
}

// ---------------------------------------------------------------------------
// Forward Algorithm
// ---------------------------------------------------------------------------

/**
 * Forward algorithm — compute forward probabilities alpha[t][j]
 * and scaling factors c[t] for numerical stability.
 * @param {number[]} observations — log returns
 * @param {number[]} pi — initial state distribution
 * @param {number[][]} A — transition matrix
 * @param {number[]} means — emission means per state
 * @param {number[]} variances — emission variances per state
 * @returns {{ alpha: number[][], c: number[], logLikelihood: number }}
 */
function forward(observations, pi, A, means, variances) {
  const T = observations.length;
  const N = pi.length;
  const alpha = [];
  const c = [];

  // t = 0: initialization
  const alpha0 = [];
  let sum0 = 0;
  for (let j = 0; j < N; j++) {
    const val = pi[j] * gaussianPdf(observations[0], means[j], variances[j]);
    alpha0.push(val);
    sum0 += val;
  }
  // Scale to prevent underflow
  const c0 = sum0 > 0 ? 1.0 / sum0 : 1.0;
  for (let j = 0; j < N; j++) alpha0[j] *= c0;
  alpha.push(alpha0);
  c.push(c0);

  // t = 1..T-1: induction
  for (let t = 1; t < T; t++) {
    const alphaT = [];
    let sumT = 0;
    for (let j = 0; j < N; j++) {
      let acc = 0;
      for (let i = 0; i < N; i++) {
        acc += alpha[t - 1][i] * A[i][j];
      }
      const val = acc * gaussianPdf(observations[t], means[j], variances[j]);
      alphaT.push(val);
      sumT += val;
    }
    const ct = sumT > 0 ? 1.0 / sumT : 1.0;
    for (let j = 0; j < N; j++) alphaT[j] *= ct;
    alpha.push(alphaT);
    c.push(ct);
  }

  // Log-likelihood from scaling factors: LL = -sum(log(c[t]))
  let logLikelihood = 0;
  for (let t = 0; t < T; t++) {
    logLikelihood -= Math.log(c[t]);
  }

  return { alpha, c, logLikelihood };
}

// ---------------------------------------------------------------------------
// Backward Algorithm
// ---------------------------------------------------------------------------

/**
 * Backward algorithm — compute backward probabilities beta[t][j]
 * using the same scaling factors from the forward pass.
 * @param {number[]} observations — log returns
 * @param {number[][]} A — transition matrix
 * @param {number[]} means — emission means per state
 * @param {number[]} variances — emission variances per state
 * @param {number[]} c — scaling factors from forward pass
 * @returns {number[][]} beta — backward probabilities
 */
function backward(observations, A, means, variances, c) {
  const T = observations.length;
  const N = A.length;
  const beta = new Array(T);

  // t = T-1: initialization
  beta[T - 1] = [];
  for (let j = 0; j < N; j++) {
    beta[T - 1].push(c[T - 1]);
  }

  // t = T-2..0: induction
  for (let t = T - 2; t >= 0; t--) {
    beta[t] = [];
    for (let i = 0; i < N; i++) {
      let acc = 0;
      for (let j = 0; j < N; j++) {
        acc += A[i][j] * gaussianPdf(observations[t + 1], means[j], variances[j]) * beta[t + 1][j];
      }
      beta[t].push(acc * c[t]);
    }
  }

  return beta;
}

// ---------------------------------------------------------------------------
// Baum-Welch (EM) Algorithm
// ---------------------------------------------------------------------------

/**
 * Baum-Welch (EM) algorithm for HMM parameter estimation.
 * @param {number[]} observations — log returns
 * @param {number} nStates — number of hidden states
 * @param {Object} [opts]
 * @param {number} [opts.maxIter=100] — maximum EM iterations
 * @param {number} [opts.tolerance=1e-6] — convergence tolerance on log-likelihood
 * @returns {{ pi: number[], A: number[][], means: number[], variances: number[], logLikelihood: number, iterations: number }}
 */
export function baumWelch(observations, nStates = 4, opts = {}) {
  const maxIter = opts.maxIter != null ? opts.maxIter : 100;
  const tolerance = opts.tolerance != null ? opts.tolerance : 1e-6;

  const T = observations.length;
  if (T < 2) {
    throw new Error('baumWelch: need at least 2 observations');
  }

  let { pi, A, means, variances } = initializeParams(observations, nStates);
  let prevLL = -Infinity;
  let iterations = 0;

  for (let iter = 0; iter < maxIter; iter++) {
    iterations = iter + 1;

    // E-step: forward-backward
    const { alpha, c, logLikelihood } = forward(observations, pi, A, means, variances);
    const beta = backward(observations, A, means, variances, c);

    // Check convergence
    if (Math.abs(logLikelihood - prevLL) < tolerance && iter > 0) {
      prevLL = logLikelihood;
      break;
    }
    prevLL = logLikelihood;

    // Compute gamma[t][i] = P(state i at time t | observations)
    const gamma = [];
    for (let t = 0; t < T; t++) {
      const gammaT = [];
      let sumG = 0;
      for (let i = 0; i < nStates; i++) {
        const val = alpha[t][i] * beta[t][i];
        gammaT.push(val);
        sumG += val;
      }
      // Normalize
      if (sumG > 0) {
        for (let i = 0; i < nStates; i++) gammaT[i] /= sumG;
      }
      gamma.push(gammaT);
    }

    // Compute xi[t][i][j] = P(state i at t and state j at t+1 | observations)
    const xi = [];
    for (let t = 0; t < T - 1; t++) {
      const xiT = [];
      let sumXi = 0;
      for (let i = 0; i < nStates; i++) {
        const xiRow = [];
        for (let j = 0; j < nStates; j++) {
          const val = alpha[t][i] * A[i][j] *
            gaussianPdf(observations[t + 1], means[j], variances[j]) * beta[t + 1][j];
          xiRow.push(val);
          sumXi += val;
        }
        xiT.push(xiRow);
      }
      // Normalize
      if (sumXi > 0) {
        for (let i = 0; i < nStates; i++) {
          for (let j = 0; j < nStates; j++) {
            xiT[i][j] /= sumXi;
          }
        }
      }
      xi.push(xiT);
    }

    // M-step: re-estimate parameters

    // Update pi
    for (let i = 0; i < nStates; i++) {
      pi[i] = gamma[0][i];
    }

    // Update A
    for (let i = 0; i < nStates; i++) {
      let gammaSum = 0;
      for (let t = 0; t < T - 1; t++) gammaSum += gamma[t][i];

      for (let j = 0; j < nStates; j++) {
        let xiSum = 0;
        for (let t = 0; t < T - 1; t++) xiSum += xi[t][i][j];
        A[i][j] = gammaSum > 0 ? xiSum / gammaSum : 1.0 / nStates;
      }
    }

    // Update means and variances
    for (let j = 0; j < nStates; j++) {
      let gammaSum = 0;
      let weightedSum = 0;
      for (let t = 0; t < T; t++) {
        gammaSum += gamma[t][j];
        weightedSum += gamma[t][j] * observations[t];
      }

      const newMean = gammaSum > 0 ? weightedSum / gammaSum : means[j];

      let weightedVarSum = 0;
      for (let t = 0; t < T; t++) {
        const dev = observations[t] - newMean;
        weightedVarSum += gamma[t][j] * dev * dev;
      }
      const newVar = gammaSum > 0 ? weightedVarSum / gammaSum : variances[j];

      means[j] = newMean;
      variances[j] = Math.max(newVar, 1e-10); // Floor to prevent degeneracy
    }
  }

  return { pi, A, means, variances, logLikelihood: prevLL, iterations };
}

// ---------------------------------------------------------------------------
// Viterbi Algorithm
// ---------------------------------------------------------------------------

/**
 * Viterbi algorithm — find most likely state sequence.
 * @param {number[]} observations — log returns
 * @param {{ pi: number[], A: number[][], means: number[], variances: number[] }} params — HMM parameters
 * @returns {number[]} — most likely state sequence
 */
export function viterbi(observations, params) {
  const { pi, A, means, variances } = params;
  const T = observations.length;
  const N = pi.length;

  if (T === 0) return [];

  // Work in log space for numerical stability
  const delta = []; // delta[t][j] = max log prob of path ending in state j at time t
  const psi = [];   // psi[t][j] = argmax predecessor state

  // t = 0: initialization
  const delta0 = [];
  const psi0 = [];
  for (let j = 0; j < N; j++) {
    const emission = gaussianPdf(observations[0], means[j], variances[j]);
    delta0.push(Math.log(Math.max(pi[j], 1e-300)) + Math.log(Math.max(emission, 1e-300)));
    psi0.push(0);
  }
  delta.push(delta0);
  psi.push(psi0);

  // t = 1..T-1: recursion
  for (let t = 1; t < T; t++) {
    const deltaT = [];
    const psiT = [];
    for (let j = 0; j < N; j++) {
      let bestVal = -Infinity;
      let bestIdx = 0;
      for (let i = 0; i < N; i++) {
        const val = delta[t - 1][i] + Math.log(Math.max(A[i][j], 1e-300));
        if (val > bestVal) {
          bestVal = val;
          bestIdx = i;
        }
      }
      const emission = gaussianPdf(observations[t], means[j], variances[j]);
      deltaT.push(bestVal + Math.log(Math.max(emission, 1e-300)));
      psiT.push(bestIdx);
    }
    delta.push(deltaT);
    psi.push(psiT);
  }

  // Backtrack: find the best final state
  const path = new Array(T);
  let bestFinal = -Infinity;
  let bestFinalIdx = 0;
  for (let j = 0; j < N; j++) {
    if (delta[T - 1][j] > bestFinal) {
      bestFinal = delta[T - 1][j];
      bestFinalIdx = j;
    }
  }
  path[T - 1] = bestFinalIdx;

  // Backtrack through psi
  for (let t = T - 2; t >= 0; t--) {
    path[t] = psi[t + 1][path[t + 1]];
  }

  return path;
}

// ---------------------------------------------------------------------------
// Fit HMM Regimes
// ---------------------------------------------------------------------------

/**
 * Fit HMM regime detector to return series.
 * @param {Array} bars — OHLCV bars (must have .close property)
 * @param {Object} [opts]
 * @param {number} [opts.nStates=4] — number of hidden states
 * @param {number} [opts.maxIter=100] — max Baum-Welch iterations
 * @param {number} [opts.scale=6] — truncation scale for deterministic output
 * @returns {{
 *   regime_per_bar: string[],
 *   regime_ids: number[],
 *   transition_matrix: number[][],
 *   state_means: number[],
 *   state_variances: number[],
 *   p_regime_change: number[],
 *   avg_regime_duration: Object,
 *   current_regime: string,
 *   verdict: string,
 *   reason: string
 * }}
 */
export function fitHMMRegimes(bars, opts = {}) {
  const nStates = opts.nStates != null ? opts.nStates : 4;
  const maxIter = opts.maxIter != null ? opts.maxIter : 100;
  const scale = opts.scale != null ? opts.scale : 6;

  // Compute log returns from close prices
  const logReturns = [];
  for (let i = 1; i < bars.length; i++) {
    const prev = bars[i - 1].close;
    const curr = bars[i].close;
    if (prev > 0 && curr > 0) {
      logReturns.push(Math.log(curr / prev));
    } else {
      logReturns.push(0);
    }
  }

  if (logReturns.length < 2) {
    return {
      regime_per_bar: [],
      regime_ids: [],
      transition_matrix: [],
      state_means: [],
      state_variances: [],
      p_regime_change: [],
      avg_regime_duration: {},
      current_regime: 'UNKNOWN',
      verdict: 'FAIL',
      reason: 'INSUFFICIENT_DATA',
    };
  }

  // Fit HMM via Baum-Welch
  const hmmParams = baumWelch(logReturns, nStates, { maxIter });

  // Sort states by variance (ascending) so index 0 = LOW_VOL, last = CRISIS
  const stateOrder = Array.from({ length: nStates }, (_, i) => i);
  stateOrder.sort((a, b) => hmmParams.variances[a] - hmmParams.variances[b]);

  // Build mapping from old index to new sorted index
  const oldToNew = new Array(nStates);
  for (let newIdx = 0; newIdx < nStates; newIdx++) {
    oldToNew[stateOrder[newIdx]] = newIdx;
  }

  // Reorder parameters according to the sorted state order
  const sortedMeans = stateOrder.map(i => truncateTowardZero(hmmParams.means[i], scale));
  const sortedVariances = stateOrder.map(i => truncateTowardZero(hmmParams.variances[i], scale));

  // Reorder transition matrix
  const sortedA = [];
  for (let i = 0; i < nStates; i++) {
    const row = [];
    for (let j = 0; j < nStates; j++) {
      row.push(truncateTowardZero(hmmParams.A[stateOrder[i]][stateOrder[j]], scale));
    }
    sortedA.push(row);
  }

  // Reorder pi
  const sortedPi = stateOrder.map(i => hmmParams.pi[i]);

  // Run Viterbi on log returns to get most likely state sequence
  const rawPath = viterbi(logReturns, hmmParams);

  // Map raw states to sorted states
  const regimeIds = rawPath.map(s => oldToNew[s]);
  const regimeNames = regimeIds.map(s => s < STATE_NAMES.length ? STATE_NAMES[s] : `STATE_${s}`);

  // Compute per-bar regime change probability:
  // p_change[t] = 1 - A[state[t]][state[t]]  (probability of leaving current state)
  const pRegimeChange = [];
  for (let t = 0; t < regimeIds.length; t++) {
    const currentState = regimeIds[t];
    const stayProb = sortedA[currentState][currentState];
    pRegimeChange.push(truncateTowardZero(1.0 - stayProb, scale));
  }

  // Compute average regime duration per state
  // Average duration in state s = 1 / (1 - A[s][s])
  const avgRegimeDuration = {};
  for (let s = 0; s < nStates; s++) {
    const name = s < STATE_NAMES.length ? STATE_NAMES[s] : `STATE_${s}`;
    const stayProb = sortedA[s][s];
    avgRegimeDuration[name] = stayProb < 1.0
      ? truncateTowardZero(1.0 / (1.0 - stayProb), scale)
      : Infinity;
  }

  // Current regime (last bar)
  const currentRegimeId = regimeIds.length > 0 ? regimeIds[regimeIds.length - 1] : 0;
  const currentRegime = currentRegimeId < STATE_NAMES.length
    ? STATE_NAMES[currentRegimeId]
    : `STATE_${currentRegimeId}`;

  // ── Verdict logic ──
  // Count profitable regimes: states with positive mean return
  let profitableRegimes = 0;
  for (let s = 0; s < nStates; s++) {
    if (sortedMeans[s] > 0) profitableRegimes++;
  }

  // Current regime change probability
  const currentPChange = pRegimeChange.length > 0
    ? pRegimeChange[pRegimeChange.length - 1]
    : 0;

  // Crisis fraction: proportion of bars in CRISIS state (last state by variance)
  const crisisStateId = nStates - 1;
  let crisisCount = 0;
  for (let t = 0; t < regimeIds.length; t++) {
    if (regimeIds[t] === crisisStateId) crisisCount++;
  }
  const crisisFraction = regimeIds.length > 0 ? crisisCount / regimeIds.length : 0;

  let verdict, reason;
  if (profitableRegimes < 2) {
    verdict = 'FAIL';
    reason = 'HMM_FEW_REGIMES';
  } else if (currentPChange > 0.3) {
    verdict = 'WARN';
    reason = 'HMM_REGIME_CHANGE_HIGH';
  } else if (crisisFraction > 0.2) {
    verdict = 'WARN';
    reason = 'HMM_CRISIS_DOMINANT';
  } else {
    verdict = 'PASS';
    reason = 'HMM_PASS';
  }

  return {
    regime_per_bar: regimeNames,
    regime_ids: regimeIds,
    transition_matrix: sortedA,
    state_means: sortedMeans,
    state_variances: sortedVariances,
    p_regime_change: pRegimeChange,
    avg_regime_duration: avgRegimeDuration,
    current_regime: currentRegime,
    verdict,
    reason,
  };
}
