/**
 * position_sizer.mjs — Graduated position sizing
 *
 * Sprint 3: Enforces tier-based max risk per position.
 * Tiers: micro (≤0.1%), small (≤1%), normal (≤5%).
 * Pure function, deterministic, no side effects.
 */

const TIERS = [
  { name: 'micro',  max_risk_pct: 0.001, description: '0.1% of equity' },
  { name: 'small',  max_risk_pct: 0.01,  description: '1% of equity' },
  { name: 'normal', max_risk_pct: 0.05,  description: '5% of equity' },
];

/**
 * Compute position size for a given tier and equity.
 *
 * @param {number} equity — current account equity in USD
 * @param {string} tier — 'micro' | 'small' | 'normal'
 * @param {number} signal_risk — risk per unit (e.g. distance to stop-loss in USD)
 * @returns {{ size: number, tier: string, max_risk_usd: number, equity: number, reason?: string }}
 */
export function computePositionSize(equity, tier, signal_risk) {
  if (typeof equity !== 'number' || equity <= 0) {
    return { size: 0, tier, max_risk_usd: 0, equity: equity || 0, reason: 'invalid equity' };
  }

  const tierConfig = TIERS.find(t => t.name === tier);
  if (!tierConfig) {
    return { size: 0, tier, max_risk_usd: 0, equity, reason: `unknown tier: ${tier}` };
  }

  const maxRisk = equity * tierConfig.max_risk_pct;

  if (typeof signal_risk !== 'number' || signal_risk <= 0) {
    return { size: 0, tier: tierConfig.name, max_risk_usd: maxRisk, equity, reason: 'invalid signal_risk' };
  }

  const size = maxRisk / signal_risk;

  return { size, tier: tierConfig.name, max_risk_usd: maxRisk, equity };
}

/**
 * Get tier configuration.
 * @param {string} tierName
 * @returns {Object|null}
 */
export function getTier(tierName) {
  return TIERS.find(t => t.name === tierName) || null;
}

/**
 * Get all available tiers.
 * @returns {Array}
 */
export function getAllTiers() {
  return [...TIERS];
}
