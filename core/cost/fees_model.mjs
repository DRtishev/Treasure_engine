// Sprint 7: Fee Model -- SSOT for fee calculation
// Maker/taker separation. Tier-aware placeholder for future.

const DEFAULT_CONFIG = {
  fee_maker_bps: 2,
  fee_taker_bps: 4,
  tier: 'DEFAULT'
};

/**
 * Compute fee for a fill.
 * @param {{ price: number, qty: number, order_type: 'MAKER'|'TAKER', config?: object }} params
 * @returns {{ fee_bps: number, fee_usd: number }}
 */
export function computeFee({ price, qty, order_type = 'TAKER', config = {} }) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const fee_bps = order_type === 'MAKER' ? cfg.fee_maker_bps : cfg.fee_taker_bps;
  const notional = Math.abs(price * qty);
  const fee_usd = Math.round(notional * (fee_bps / 10000) * 100) / 100;
  return { fee_bps, fee_usd };
}
