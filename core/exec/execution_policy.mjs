// core/exec/execution_policy.mjs
// Execution Policy — определяет параметры исполнения ордеров
// Принцип: АГРЕССИВНОСТЬ через tips/TTL, но в рамках разумных лимитов

/**
 * Compute competition score from bar metrics
 * Competition score показывает насколько "конкурентна" среда для этого ордера
 * Высокий competition = нужны tips, низкий TTL
 * @param {Object} bar - Current bar
 * @returns {number} Competition score [0..1]
 */
export function computeCompetitionScore(bar) {
  if (!bar || typeof bar !== 'object') return 0.5; // neutral
  
  const volatility = bar.volatility || 0.01;
  const volume = bar.volume_usd || 500000;
  const spread = bar.spread_bps || 10;
  
  // High volatility = high competition (fast moving market)
  const volScore = Math.min(volatility / 0.03, 1); // 3% vol = max competition
  
  // High volume = lower competition (more liquidity)
  const volumeScore = 1 - Math.min(volume / 5000000, 1); // $5M = min competition
  
  // Wide spread = higher competition (fragmented liquidity)
  const spreadScore = Math.min(spread / 30, 1); // 30 bps = max competition
  
  // Weighted combination
  const score = 0.4 * volScore + 0.3 * volumeScore + 0.3 * spreadScore;
  
  return Math.max(0, Math.min(1, score));
}

/**
 * Compute execution parameters based on signal, bar, and policy config
 * @param {Object} signal - Trade signal
 * @param {Object} bar - Current bar
 * @param {Object} ssot - SSOT configuration
 * @returns {Object} {ttl_ms, tip_bps, competition_score, strategy}
 */
export function compute(signal, bar, ssot) {
  const config = ssot.execution_policy || {};
  
  // Defaults
  const defaultTtlMs = config.default_ttl_ms || 5000;
  const maxTtlMs = config.max_ttl_ms || 30000;
  const tipStrategy = config.tip_strategy || 'adaptive';
  const minTipBps = config.min_tip_bps || 0;
  const maxTipBps = config.max_tip_bps || 5;
  const competitionThreshold = config.competition_threshold || 0.7;
  
  // Compute competition score
  const competitionScore = computeCompetitionScore(bar);
  
  // TTL strategy: shorter TTL in high competition
  let ttlMs;
  if (competitionScore > competitionThreshold) {
    // High competition: aggressive TTL (shorter)
    ttlMs = defaultTtlMs * 0.6; // 60% of default
  } else {
    // Low competition: relaxed TTL
    ttlMs = defaultTtlMs * 1.2; // 120% of default
  }
  ttlMs = Math.min(ttlMs, maxTtlMs);
  ttlMs = Math.max(ttlMs, 1000); // minimum 1 second
  
  // Tip strategy
  let tipBps;
  if (tipStrategy === 'adaptive') {
    // Adaptive: scale tip with competition score
    tipBps = minTipBps + (maxTipBps - minTipBps) * competitionScore;
  } else if (tipStrategy === 'fixed') {
    // Fixed: always use minTipBps
    tipBps = minTipBps;
  } else if (tipStrategy === 'none') {
    // No tips
    tipBps = 0;
  } else {
    // Default to adaptive
    tipBps = minTipBps + (maxTipBps - minTipBps) * competitionScore;
  }
  
  return {
    ttl_ms: Math.round(ttlMs),
    tip_bps: Math.round(tipBps * 100) / 100, // 2 decimal places
    competition_score: Math.round(competitionScore * 1000) / 1000, // 3 decimal places
    strategy: tipStrategy
  };
}

/**
 * Validate execution parameters
 * @param {Object} execParams - Execution parameters from compute()
 * @param {Object} ssot - SSOT configuration
 * @returns {Object} {valid: boolean, reason: string}
 */
export function validate(execParams, ssot) {
  const config = ssot.execution_policy || {};
  const maxTtlMs = config.max_ttl_ms || 30000;
  const maxTipBps = config.max_tip_bps || 5;
  
  // Check TTL
  if (execParams.ttl_ms <= 0) {
    return { valid: false, reason: 'TTL must be positive' };
  }
  
  if (execParams.ttl_ms > maxTtlMs) {
    return { valid: false, reason: `TTL ${execParams.ttl_ms}ms exceeds max ${maxTtlMs}ms` };
  }
  
  // Check tip
  if (execParams.tip_bps < 0) {
    return { valid: false, reason: 'Tip cannot be negative' };
  }
  
  if (execParams.tip_bps > maxTipBps) {
    return { valid: false, reason: `Tip ${execParams.tip_bps} bps exceeds max ${maxTipBps} bps` };
  }
  
  // Check competition score
  if (execParams.competition_score < 0 || execParams.competition_score > 1) {
    return { valid: false, reason: 'Competition score must be in [0..1]' };
  }
  
  return { valid: true, reason: 'Execution parameters valid' };
}

/**
 * Aggregate execution stats
 * @param {Array} execResults - Array of execution results with execParams
 * @returns {Object} Aggregated stats
 */
export function aggregateStats(execResults) {
  if (!Array.isArray(execResults) || execResults.length === 0) {
    return {
      total: 0,
      avg_ttl_ms: 0,
      avg_tip_bps: 0,
      avg_competition: 0,
      max_ttl_ms: 0,
      max_tip_bps: 0
    };
  }
  
  const total = execResults.length;
  const ttls = execResults.map(r => r.execParams?.ttl_ms || 0);
  const tips = execResults.map(r => r.execParams?.tip_bps || 0);
  const comps = execResults.map(r => r.execParams?.competition_score || 0);
  
  return {
    total,
    avg_ttl_ms: Math.round(ttls.reduce((a, b) => a + b, 0) / total),
    avg_tip_bps: Math.round((tips.reduce((a, b) => a + b, 0) / total) * 100) / 100,
    avg_competition: Math.round((comps.reduce((a, b) => a + b, 0) / total) * 1000) / 1000,
    max_ttl_ms: Math.max(...ttls),
    max_tip_bps: Math.max(...tips)
  };
}
