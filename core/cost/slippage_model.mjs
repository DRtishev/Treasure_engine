// Sprint 7: Deterministic Slippage Model
// Formula: spread_component + depth_component + volatility_component

const DEFAULT_CONFIG = {
  spread_default_bps: 1.5,
  depth_default_usd: 1_000_000,
  depth_coeff: 0.5,
  vol_coeff: 0.1
};

/**
 * Compute deterministic slippage.
 * @param {{ price: number, qty: number, side: 'BUY'|'SELL', market_context?: object, config?: object }} params
 * @returns {{ slippage_bps: number, slippage_usd: number, exec_price: number }}
 */
export function computeSlippage({ price, qty, side, market_context = {}, config = {} }) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const order_usd = Math.abs(price * qty);

  // Spread component
  const spread_bps = market_context.spread_bps ?? cfg.spread_default_bps;
  const spread_component = spread_bps / 2;

  // Depth component
  const depth_usd = market_context.depth_usd ?? cfg.depth_default_usd;
  const participation_ratio = depth_usd > 0 ? Math.min(1.0, order_usd / depth_usd) : 1.0;
  const depth_component = participation_ratio * cfg.depth_coeff;

  // Volatility component
  const atr_pct = market_context.atr_pct ?? 0;
  const volatility_component = atr_pct * cfg.vol_coeff * 100;

  const slippage_bps = Math.round((spread_component + depth_component + volatility_component) * 10000) / 10000;
  const slippage_usd = Math.round(order_usd * (slippage_bps / 10000) * 100) / 100;

  // Exec price adjusted for slippage
  let exec_price;
  if (side === 'BUY') {
    exec_price = price * (1 + slippage_bps / 10000);
  } else {
    exec_price = price * (1 - slippage_bps / 10000);
  }
  exec_price = Math.round(exec_price * 1e8) / 1e8;

  return { slippage_bps, slippage_usd, exec_price };
}
