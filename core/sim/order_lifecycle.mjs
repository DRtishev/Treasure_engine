// core/sim/order_lifecycle.mjs
import { MODE_PROFILES } from './models.mjs';

/**
 * Simulate order execution with ExecutionPolicy and RiskGovernor integration
 * @param {string} signal - 'long' or 'short'
 * @param {Array} bars - All bars
 * @param {number} idx - Current bar index
 * @param {string} mode - 'optimistic', 'base', or 'hostile'
 * @param {Object} rng - SeededRNG instance
 * @param {Object} ssot - SSOT config
 * @param {Object} execPolicy - Execution policy from execution_policy.compute()
 * @param {Object} intent - Trade intent {size_usd, quality_score, ttl_ms, tip_bps}
 * @returns {Object} Trade result
 */
export function simulateOrder(signal, bars, idx, mode, rng, ssot, execPolicy = null, intent = null) {
  const profile = MODE_PROFILES[mode];
  
  // Extract execution parameters
  const ttl_ms = execPolicy?.ttl_ms || intent?.ttl_ms || 5000;
  const tip_bps = execPolicy?.tip_bps || intent?.tip_bps || 0;
  const competition_score = execPolicy?.competition_score || 0.5;
  const size_usd = intent?.size_usd || 1000;
  const quality_score = intent?.quality_score || 1.0;
  
  // Base latency from mode profile
  let latency_ms = Math.max(10, rng.normal(profile.latency_mean, profile.latency_std));
  
  // Competition increases latency (high competition = slower execution)
  const competition_factor = 1 + (competition_score * 0.5); // 0% to 50% increase
  latency_ms *= competition_factor;
  
  // Tip reduces latency (aggressive execution)
  const max_tip_bps = ssot.execution_policy?.max_tip_bps || 5;
  const tip_factor = 1 - ((tip_bps / max_tip_bps) * 0.3); // up to 30% reduction
  latency_ms *= Math.max(0.5, tip_factor);
  
  latency_ms = Math.round(latency_ms);
  
  // TTL EXPIRE CHECK: if latency exceeds TTL, order is rejected
  if (latency_ms > ttl_ms) {
    return {
      filled: false,
      rejected: true,
      reason: 'ttl_expired',
      fill_ratio: 0,
      pnl: 0,
      pnl_usd: 0,
      slippage_bps: 0,
      latency_ms,
      ttl_ms,
      tip_bps,
      size_usd,
      competition_score
    };
  }
  
  // Reject probability (tip reduces rejection)
  let reject_prob = profile.reject_prob;
  const tip_reject_reduction = (tip_bps / max_tip_bps) * 0.5; // up to 50% reduction
  reject_prob *= (1 - tip_reject_reduction);
  
  const rejected = rng.next() < reject_prob;
  
  if (rejected) {
    return {
      filled: false,
      rejected: true,
      reason: 'rejected_by_exchange',
      fill_ratio: 0,
      pnl: 0,
      pnl_usd: 0,
      slippage_bps: 0,
      latency_ms,
      ttl_ms,
      tip_bps,
      size_usd,
      competition_score
    };
  }

  // Successful execution
  const fillRatio = rng.uniform(0.9, 1.0);
  const slippageBps = Math.abs(rng.normal(profile.slip_mean, profile.slip_std));
  
  // Base PnL (as fraction)
  let pnl_fraction = signal === 'long' ? rng.uniform(-0.001, 0.002) : rng.uniform(-0.001, 0.002);
  
  // Apply fill ratio
  pnl_fraction *= fillRatio;
  
  // Subtract tip cost (tip is a fee)
  const tip_cost_fraction = tip_bps / 10000;
  pnl_fraction -= tip_cost_fraction;
  
  // Subtract slippage
  const slippage_cost_fraction = slippageBps / 10000;
  pnl_fraction -= slippage_cost_fraction;
  
  // Convert to USD
  const pnl_usd = pnl_fraction * size_usd;

  return {
    filled: true,
    rejected: false,
    reason: 'filled',
    fill_ratio: fillRatio,
    pnl: pnl_fraction,
    pnl_usd,
    slippage_bps: slippageBps,
    latency_ms,
    ttl_ms,
    tip_bps,
    size_usd,
    competition_score
  };
}
