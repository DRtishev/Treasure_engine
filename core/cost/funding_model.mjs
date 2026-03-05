// Sprint 7: Funding Model (Bounds-based)
// Deterministic, fail-closed: unknown → worst-case estimate

const DEFAULT_CONFIG = {
  funding_default_bps: 5,
  funding_bounds_min_bps: -5,
  funding_bounds_max_bps: 15,
  funding_period_hours: 8
};

/**
 * Compute funding cost for a position held over periods.
 * @param {{ position_usd: number, holding_periods: number, market_context?: object, config?: object }} params
 * @returns {{ funding_bps: number, funding_usd: number, funding_status: string }}
 */
export function computeFunding({ position_usd = 0, holding_periods = 0, market_context = {}, config = {} }) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (holding_periods <= 0 || position_usd <= 0) {
    return { funding_bps: 0, funding_usd: 0, funding_status: 'KNOWN' };
  }

  let funding_rate = cfg.funding_default_bps;
  let funding_status = 'BOUNDS_ESTIMATE';

  if (market_context.funding_rate_bps !== undefined && market_context.funding_rate_bps !== null) {
    funding_rate = market_context.funding_rate_bps;
    // Validate bounds
    if (funding_rate < cfg.funding_bounds_min_bps || funding_rate > cfg.funding_bounds_max_bps) {
      // Fail-closed: use worst-case
      funding_rate = cfg.funding_bounds_max_bps;
      funding_status = 'INSUFFICIENT_EVIDENCE';
    } else {
      funding_status = 'KNOWN';
    }
  }

  const funding_bps = Math.round(funding_rate * holding_periods * 10000) / 10000;
  const funding_usd = Math.round(Math.abs(position_usd) * (funding_bps / 10000) * 100) / 100;

  return { funding_bps, funding_usd, funding_status };
}
