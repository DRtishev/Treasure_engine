/**
 * fill_quality.mjs — R2.2 Fill Quality Monitor
 *
 * Measures execution quality by comparing actual fills vs cost model predictions.
 * Produces hidden_bps, fill_ratio_accuracy, price_improvement_bps, quality_score.
 *
 * Deterministic, pure function, no side effects.
 */

/**
 * Evaluate fill quality for a single fill.
 *
 * @param {Object} fill — actual fill { exec_price, price, qty, fee, fill_ratio }
 * @param {Object} prediction — cost model prediction { exec_price, fee_bps, slippage_bps, total_cost_bps, fill_ratio }
 * @returns {Object} quality metrics
 */
export function evaluateFillQuality(fill, prediction) {
  const actualPrice = fill.exec_price || fill.price;
  const predictedPrice = prediction.exec_price || fill.price;
  const refPrice = fill.price || 1;

  // hidden_bps: actual cost minus predicted cost (positive = worse than expected)
  const actualSlipBps = Math.abs(actualPrice - refPrice) / refPrice * 10000;
  const predictedSlipBps = prediction.slippage_bps || 0;
  const hidden_bps = actualSlipBps - predictedSlipBps;

  // fee comparison
  const actualFeeBps = fill.fee && fill.qty && refPrice
    ? (fill.fee / (fill.qty * refPrice)) * 10000
    : 0;
  const predictedFeeBps = prediction.fee_bps || 0;
  const fee_surprise_bps = actualFeeBps - predictedFeeBps;

  // fill ratio accuracy
  const actualFillRatio = fill.fill_ratio !== undefined ? fill.fill_ratio : 1;
  const predictedFillRatio = prediction.fill_ratio !== undefined ? prediction.fill_ratio : 1;
  const fill_ratio_accuracy = predictedFillRatio > 0
    ? 1 - Math.abs(actualFillRatio - predictedFillRatio) / predictedFillRatio
    : 1;

  // price improvement: negative hidden_bps means better than predicted
  const price_improvement_bps = -hidden_bps;

  // composite quality score (0-100)
  // Penalties: hidden_bps > 0 is bad, fee_surprise > 0 is bad, fill_ratio miss is bad
  const slipPenalty = Math.max(0, hidden_bps) * 2; // 2 points per bps hidden cost
  const feePenalty = Math.max(0, fee_surprise_bps) * 3; // 3 points per bps fee surprise
  const fillPenalty = (1 - Math.max(0, fill_ratio_accuracy)) * 20; // 20 points for missed fill ratio
  const quality_score = Math.max(0, Math.min(100, 100 - slipPenalty - feePenalty - fillPenalty));

  return {
    hidden_bps,
    fee_surprise_bps,
    fill_ratio_accuracy,
    price_improvement_bps,
    quality_score,
    actual_slip_bps: actualSlipBps,
    predicted_slip_bps: predictedSlipBps
  };
}

/**
 * Evaluate fill quality for a batch of fills.
 *
 * @param {Array<{fill: Object, prediction: Object}>} pairs
 * @returns {Object} aggregate quality metrics
 */
export function evaluateBatchQuality(pairs) {
  if (!pairs || pairs.length === 0) {
    return { count: 0, avg_hidden_bps: 0, avg_quality_score: 0, quality_scores: [] };
  }

  const results = pairs.map(p => evaluateFillQuality(p.fill, p.prediction));
  const count = results.length;
  const avg_hidden_bps = results.reduce((s, r) => s + r.hidden_bps, 0) / count;
  const avg_quality_score = results.reduce((s, r) => s + r.quality_score, 0) / count;
  const avg_fill_ratio_accuracy = results.reduce((s, r) => s + r.fill_ratio_accuracy, 0) / count;

  return {
    count,
    avg_hidden_bps,
    avg_quality_score,
    avg_fill_ratio_accuracy,
    quality_scores: results.map(r => r.quality_score),
    individual: results
  };
}
