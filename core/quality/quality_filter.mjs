// core/quality/quality_filter.mjs
// Trade Quality Filter — фильтрация сделок по качеству до входа в позицию
// Принцип: КОНСЕРВАТИВНЫЙ. Лучше пропустить хорошую сделку, чем взять плохую.

/**
 * Compute quality score from bar metrics
 * @param {Object} bar - Current bar with OHLCV + computed metrics
 * @returns {number} Quality score [0..1]
 */
export function computeQualityScore(bar) {
  if (!bar || typeof bar !== 'object') return 0;
  
  const atr = bar.atr_pct || 0;
  const volume = bar.volume_usd || 0;
  const spread = bar.spread_bps || 999;
  const volatility = bar.volatility || 0;
  
  // ATR component: higher is better (mais activity)
  const atrScore = Math.min(atr / 0.02, 1); // normalize to 2% ATR as "good"
  
  // Volume component: higher is better (liquidity)
  const volumeScore = Math.min(volume / 1000000, 1); // normalize to $1M as "good"
  
  // Spread component: lower is better (execution cost)
  const spreadScore = Math.max(0, 1 - spread / 50); // 50 bps = 0 score
  
  // Volatility component: moderate is better (not too quiet, not too chaotic)
  const optimalVol = 0.015; // 1.5%
  const volScore = 1 - Math.abs(volatility - optimalVol) / optimalVol;
  
  // Weighted combination
  const score = 0.3 * atrScore + 0.3 * volumeScore + 0.25 * spreadScore + 0.15 * Math.max(0, volScore);
  
  return Math.max(0, Math.min(1, score));
}

/**
 * Evaluate if signal passes quality filter
 * @param {Object} signal - Trade signal
 * @param {Object} bar - Current bar
 * @param {Object} ssot - SSOT configuration
 * @returns {Object} {pass: boolean, score: number, reason: string}
 */
export function evaluate(signal, bar, ssot) {
  const config = ssot.quality_filter || {};
  
  // Default thresholds (conservative)
  const minQualityScore = config.min_quality_score || 0.65;
  const minSpreadBps = config.min_spread_bps || 1;
  const maxSpreadBps = config.max_spread_bps || 50;
  const minVolumeUsd = config.min_volume_usd || 100000;
  const minAtrPct = config.min_atr_pct || 0.001;
  
  // Check spread FIRST (before quality score)
  const spread = bar.spread_bps || 999;
  if (spread < minSpreadBps) {
    return {
      pass: false,
      score: 0,
      reason: `Spread too tight: ${spread.toFixed(1)} bps < ${minSpreadBps} bps (suspicious)`
    };
  }
  
  if (spread > maxSpreadBps) {
    return {
      pass: false,
      score: 0,
      reason: `Spread too wide: ${spread.toFixed(1)} bps > ${maxSpreadBps} bps`
    };
  }
  
  // Check volume (before quality score)
  const volume = bar.volume_usd || 0;
  if (volume < minVolumeUsd) {
    return {
      pass: false,
      score: 0,
      reason: `Volume too low: $${volume.toFixed(0)} < $${minVolumeUsd}`
    };
  }
  
  // Check ATR (before quality score)
  const atr = bar.atr_pct || 0;
  if (atr < minAtrPct) {
    return {
      pass: false,
      score: 0,
      reason: `ATR too low: ${(atr * 100).toFixed(3)}% < ${(minAtrPct * 100).toFixed(3)}%`
    };
  }
  
  // Compute quality score LAST
  const qualityScore = computeQualityScore(bar);
  
  // Check quality score
  if (qualityScore < minQualityScore) {
    return {
      pass: false,
      score: qualityScore,
      reason: `Quality score too low: ${qualityScore.toFixed(3)} < ${minQualityScore}`
    };
  }
  
  // All checks passed
  return {
    pass: true,
    score: qualityScore,
    reason: 'Quality checks passed'
  };
}

/**
 * Aggregate quality stats from trades
 * @param {Array} qualityChecks - Array of quality check results
 * @returns {Object} Aggregated stats
 */
export function aggregateStats(qualityChecks) {
  if (!Array.isArray(qualityChecks) || qualityChecks.length === 0) {
    return {
      total: 0,
      passed: 0,
      filtered: 0,
      pass_rate: 0,
      avg_score: 0,
      min_score: 0,
      max_score: 0
    };
  }
  
  const total = qualityChecks.length;
  const passed = qualityChecks.filter(c => c.pass).length;
  const filtered = total - passed;
  const scores = qualityChecks.map(c => c.score);
  
  return {
    total,
    passed,
    filtered,
    pass_rate: total > 0 ? passed / total : 0,
    avg_score: scores.reduce((a, b) => a + b, 0) / total,
    min_score: Math.min(...scores),
    max_score: Math.max(...scores)
  };
}
