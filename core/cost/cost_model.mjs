// Sprint 7: SSOT Cost Model Aggregator
// PARITY LAW: backtest/paper/live all call computeTotalCost()
// Deterministic, no stochastic components.

import { computeFee } from './fees_model.mjs';
import { computeSlippage } from './slippage_model.mjs';
import { computeFunding } from './funding_model.mjs';

const DEFAULT_CONFIG = {
  fee_maker_bps: 2,
  fee_taker_bps: 4,
  spread_default_bps: 1.5,
  depth_default_usd: 1_000_000,
  depth_coeff: 0.5,
  vol_coeff: 0.1,
  liquidity_fraction: 0.1,
  default_fill_ratio: 0.95,
  funding_default_bps: 5,
  funding_bounds_min_bps: -5,
  funding_bounds_max_bps: 15,
  funding_period_hours: 8
};

/**
 * Compute total execution cost — SSOT for all modes.
 *
 * @param {{
 *   price: number,
 *   qty: number,
 *   side: 'BUY' | 'SELL',
 *   order_type?: 'MAKER' | 'TAKER',
 *   mode?: 'backtest' | 'paper' | 'live',
 *   market_context?: {
 *     spread_bps?: number,
 *     depth_usd?: number,
 *     atr_pct?: number,
 *     funding_rate_bps?: number,
 *     holding_periods?: number
 *   },
 *   config?: object
 * }} params
 * @returns {CostResult}
 */
export function computeTotalCost({
  price,
  qty,
  side,
  order_type = 'TAKER',
  mode = 'backtest',
  market_context = {},
  config = {}
}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const order_usd = Math.abs(price * qty);

  // 1. Partial fill ratio
  const depth_usd = market_context.depth_usd ?? cfg.depth_default_usd;
  const available_liquidity = depth_usd * cfg.liquidity_fraction;
  let fill_ratio;
  if (depth_usd > 0 && market_context.depth_usd !== undefined) {
    fill_ratio = Math.min(1.0, available_liquidity / order_usd);
    fill_ratio = Math.round(fill_ratio * 10000) / 10000;
  } else {
    fill_ratio = cfg.default_fill_ratio;
  }
  const filled_qty = Math.round(qty * fill_ratio * 1e8) / 1e8;

  // 2. Fees (on filled amount)
  const { fee_bps, fee_usd } = computeFee({
    price,
    qty: filled_qty,
    order_type,
    config: cfg
  });

  // 3. Slippage (on filled amount)
  const { slippage_bps, slippage_usd, exec_price } = computeSlippage({
    price,
    qty: filled_qty,
    side,
    market_context,
    config: cfg
  });

  // 4. Funding
  const position_usd = Math.abs(price * filled_qty);
  const holding_periods = market_context.holding_periods ?? 0;
  const { funding_bps, funding_usd, funding_status } = computeFunding({
    position_usd,
    holding_periods,
    market_context,
    config: cfg
  });

  // 5. Totals
  const total_cost_bps = Math.round((fee_bps + slippage_bps + funding_bps) * 10000) / 10000;
  const total_cost_usd = Math.round((fee_usd + slippage_usd + funding_usd) * 100) / 100;

  return {
    fee_bps,
    fee_usd,
    slippage_bps,
    slippage_usd,
    funding_bps,
    funding_usd,
    funding_status,
    fill_ratio,
    filled_qty,
    total_cost_bps,
    total_cost_usd,
    exec_price
  };
}

/** Required fields in CostResult — used by contract checks */
export const COST_RESULT_REQUIRED_FIELDS = [
  'fee_bps', 'fee_usd',
  'slippage_bps', 'slippage_usd',
  'funding_bps', 'funding_usd', 'funding_status',
  'fill_ratio', 'filled_qty',
  'total_cost_bps', 'total_cost_usd',
  'exec_price'
];
