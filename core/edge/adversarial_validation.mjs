/**
 * adversarial_validation.mjs — Adversarial Validation Court
 *
 * Trains a simple classifier to distinguish train bars from test bars.
 * If accuracy > 60%, the data distributions are different → backtest is unreliable.
 *
 * Uses decision stumps (single-feature threshold classifiers) as ensemble.
 * No ML dependencies needed.
 *
 * ZERO external dependencies. Pure, deterministic.
 */

import { truncateTowardZero } from './deterministic_math.mjs';

const FEATURE_NAMES = ['return', 'range', 'volume_change', 'body_ratio', 'upper_wick', 'lower_wick'];

/**
 * Extract features from a bar for classification.
 * Features: return, range, volume_change, body_ratio, upper_wick, lower_wick
 * @param {Object} bar — OHLCV bar
 * @param {Object} prevBar — previous bar (for delta features)
 * @returns {number[]} — feature vector
 */
export function extractFeatures(bar, prevBar) {
  const open = Number(bar.open ?? bar.o ?? 0);
  const high = Number(bar.high ?? bar.h ?? 0);
  const low = Number(bar.low ?? bar.l ?? 0);
  const close = Number(bar.close ?? bar.c ?? 0);
  const volume = Number(bar.volume ?? bar.v ?? 0);

  const prevClose = Number(prevBar.close ?? prevBar.c ?? 0);
  const prevVolume = Number(prevBar.volume ?? prevBar.v ?? 0);

  // return: close-to-close return
  const ret = prevClose > 0 ? (close - prevClose) / prevClose : 0;

  // range: (high - low) / open — normalized bar range
  const range = open > 0 ? (high - low) / open : 0;

  // volume_change: relative volume change vs previous bar
  const volume_change = prevVolume > 0 ? (volume - prevVolume) / prevVolume : 0;

  // body_ratio: |close - open| / (high - low) — how much of the bar is body
  const barRange = high - low;
  const body_ratio = barRange > 0 ? Math.abs(close - open) / barRange : 0;

  // upper_wick: (high - max(open, close)) / (high - low)
  const upper_wick = barRange > 0 ? (high - Math.max(open, close)) / barRange : 0;

  // lower_wick: (min(open, close) - low) / (high - low)
  const lower_wick = barRange > 0 ? (Math.min(open, close) - low) / barRange : 0;

  return [
    Number.isFinite(ret) ? ret : 0,
    Number.isFinite(range) ? range : 0,
    Number.isFinite(volume_change) ? volume_change : 0,
    Number.isFinite(body_ratio) ? body_ratio : 0,
    Number.isFinite(upper_wick) ? upper_wick : 0,
    Number.isFinite(lower_wick) ? lower_wick : 0
  ];
}

/**
 * Decision stump classifier — finds best single-feature split.
 * @param {number[][]} X — feature matrix
 * @param {number[]} y — labels (0 or 1)
 * @param {number} featureIdx — which feature to split on
 * @returns {{ threshold: number, polarity: number, accuracy: number }}
 */
function bestStump(X, y, featureIdx) {
  const n = X.length;
  if (n === 0) return { threshold: 0, polarity: 1, accuracy: 0.5 };

  // Collect unique feature values as candidate thresholds
  const values = X.map((row) => row[featureIdx]);
  const sorted = [...new Set(values)].sort((a, b) => a - b);

  let bestAcc = 0;
  let bestThreshold = 0;
  let bestPolarity = 1;

  for (const threshold of sorted) {
    for (const polarity of [1, -1]) {
      let correct = 0;
      for (let i = 0; i < n; i++) {
        const predicted = polarity === 1
          ? (values[i] <= threshold ? 0 : 1)
          : (values[i] <= threshold ? 1 : 0);
        if (predicted === y[i]) correct += 1;
      }
      const acc = correct / n;
      if (acc > bestAcc) {
        bestAcc = acc;
        bestThreshold = threshold;
        bestPolarity = polarity;
      }
    }
  }

  return { threshold: bestThreshold, polarity: bestPolarity, accuracy: bestAcc };
}

/**
 * Deterministic xorshift32 PRNG.
 * @param {number} seed
 * @returns {function(): number} — returns float in [0, 1)
 */
function xorshift32(seed) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

/**
 * Deterministic shuffle using Fisher-Yates with seeded PRNG.
 * @param {Array} arr — array to shuffle (mutated in place)
 * @param {function} rng — PRNG function returning [0, 1)
 * @returns {Array}
 */
function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Cross-validated accuracy using decision stump ensemble.
 * @param {number[][]} X — feature matrix
 * @param {number[]} y — labels
 * @param {Object} [opts]
 * @param {number} [opts.folds=5]
 * @param {number} [opts.seed=42]
 * @returns {number} — mean accuracy across folds
 */
export function crossValidatedAccuracy(X, y, opts = {}) {
  const folds = opts.folds ?? 5;
  const seed = opts.seed ?? 42;
  const n = X.length;
  const numFeatures = X[0]?.length ?? 0;

  if (n < folds || numFeatures === 0) return 0.5;

  // Create shuffled indices for fold assignment
  const indices = Array.from({ length: n }, (_, i) => i);
  const rng = xorshift32(seed);
  shuffle(indices, rng);

  // Assign fold ids
  const foldAssignment = new Array(n);
  for (let i = 0; i < n; i++) {
    foldAssignment[indices[i]] = i % folds;
  }

  let totalCorrect = 0;
  let totalCount = 0;

  for (let fold = 0; fold < folds; fold++) {
    // Split into train/test for this fold
    const trainX = [];
    const trainY = [];
    const testX = [];
    const testY = [];

    for (let i = 0; i < n; i++) {
      if (foldAssignment[i] === fold) {
        testX.push(X[i]);
        testY.push(y[i]);
      } else {
        trainX.push(X[i]);
        trainY.push(y[i]);
      }
    }

    if (trainX.length === 0 || testX.length === 0) continue;

    // Train a stump on each feature, pick the best ensemble via majority vote
    const stumps = [];
    for (let f = 0; f < numFeatures; f++) {
      stumps.push({ featureIdx: f, ...bestStump(trainX, trainY, f) });
    }

    // Predict on test set using ensemble majority vote
    for (let i = 0; i < testX.length; i++) {
      let votes0 = 0;
      let votes1 = 0;
      for (const stump of stumps) {
        const val = testX[i][stump.featureIdx];
        const pred = stump.polarity === 1
          ? (val <= stump.threshold ? 0 : 1)
          : (val <= stump.threshold ? 1 : 0);
        if (pred === 0) votes0 += 1;
        else votes1 += 1;
      }
      const predicted = votes1 > votes0 ? 1 : 0;
      if (predicted === testY[i]) totalCorrect += 1;
      totalCount += 1;
    }
  }

  return totalCount > 0 ? totalCorrect / totalCount : 0.5;
}

/**
 * Run adversarial validation between two sets of bars.
 * @param {Array} trainBars — training period bars
 * @param {Array} testBars — test/validation period bars
 * @param {Object} [opts]
 * @param {number} [opts.folds=5]
 * @param {number} [opts.seed=42]
 * @param {number} [opts.scale=6] — truncation scale
 * @returns {{
 *   accuracy: number,
 *   best_feature: string,
 *   feature_importances: Object,
 *   verdict: string,
 *   reason: string,
 *   detail: string
 * }}
 */
export function adversarialValidation(trainBars, testBars, opts = {}) {
  const scale = Number.isFinite(opts.scale) ? opts.scale : 6;
  const folds = opts.folds ?? 5;
  const seed = opts.seed ?? 42;

  if (!trainBars || trainBars.length < 3 || !testBars || testBars.length < 3) {
    return {
      accuracy: 0.5,
      best_feature: 'none',
      feature_importances: {},
      verdict: 'WARN',
      reason: 'AV_INSUFFICIENT_DATA',
      detail: `Train bars: ${trainBars?.length ?? 0}, test bars: ${testBars?.length ?? 0}. Need at least 3 each.`
    };
  }

  // Extract features from train bars (label 0)
  const trainFeatures = [];
  for (let i = 1; i < trainBars.length; i++) {
    trainFeatures.push(extractFeatures(trainBars[i], trainBars[i - 1]));
  }

  // Extract features from test bars (label 1)
  const testFeatures = [];
  for (let i = 1; i < testBars.length; i++) {
    testFeatures.push(extractFeatures(testBars[i], testBars[i - 1]));
  }

  // Combine into X and y
  const X = [...trainFeatures, ...testFeatures];
  const y = [
    ...new Array(trainFeatures.length).fill(0),
    ...new Array(testFeatures.length).fill(1)
  ];

  // Cross-validated ensemble accuracy
  const accuracy = truncateTowardZero(
    crossValidatedAccuracy(X, y, { folds, seed }),
    scale
  );

  // Per-feature importance: accuracy of each individual stump
  const featureImportances = {};
  let bestFeature = FEATURE_NAMES[0];
  let bestFeatureAcc = 0;

  for (let f = 0; f < FEATURE_NAMES.length; f++) {
    const stump = bestStump(X, y, f);
    const importance = truncateTowardZero(stump.accuracy, scale);
    featureImportances[FEATURE_NAMES[f]] = importance;
    if (importance > bestFeatureAcc) {
      bestFeatureAcc = importance;
      bestFeature = FEATURE_NAMES[f];
    }
  }

  // Verdict logic
  let verdict;
  let reason;
  let detail;

  if (accuracy > 0.75) {
    verdict = 'BLOCKED';
    reason = 'AV_EXTREME_SHIFT';
    detail = `Classifier accuracy ${accuracy} > 0.75 — extreme distribution shift detected. Train and test data are fundamentally different. Backtest results are unreliable.`;
  } else if (accuracy > 0.65) {
    verdict = 'FAIL';
    reason = 'AV_DISTRIBUTION_SHIFT';
    detail = `Classifier accuracy ${accuracy} > 0.65 — significant distribution shift. Most discriminative feature: ${bestFeature}. Backtest may overstate performance.`;
  } else if (accuracy > 0.55) {
    verdict = 'WARN';
    reason = 'AV_MILD_SHIFT';
    detail = `Classifier accuracy ${accuracy} > 0.55 — mild distribution shift detected. Most discriminative feature: ${bestFeature}. Proceed with caution.`;
  } else {
    verdict = 'PASS';
    reason = 'AV_IID_CONFIRMED';
    detail = `Classifier accuracy ${accuracy} ≤ 0.55 — train and test distributions appear IID. Backtest conditions are representative.`;
  }

  return {
    accuracy,
    best_feature: bestFeature,
    feature_importances: featureImportances,
    verdict,
    reason,
    detail
  };
}
