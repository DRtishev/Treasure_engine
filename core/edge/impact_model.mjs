/**
 * impact_model.mjs — Square-Root Market Impact Model
 *
 * Replaces fixed slip_bps=2 with realistic volume-dependent slippage.
 * Based on Almgren-Chriss (2001) square-root model:
 *   impact = σ * sqrt(Q / V) * k
 *
 * Where:
 *   σ = bar volatility
 *   Q = order quantity
 *   V = bar volume
 *   k = impact coefficient (calibrated)
 *
 * ZERO external dependencies. Pure, deterministic.
 */

import { truncateTowardZero } from './deterministic_math.mjs';

// ---------------------------------------------------------------------------
// Square-Root Market Impact
// ---------------------------------------------------------------------------

/**
 * Compute square-root market impact in price units.
 * @param {Object} params
 * @param {number} params.price — current price
 * @param {number} params.quantity — order quantity (unsigned)
 * @param {number} params.volume — bar volume
 * @param {number} params.volatility — bar return volatility (stddev of log returns)
 * @param {number} [params.impactCoeff=0.1] — calibration coefficient k
 * @param {number} [params.scale=6] — truncation scale
 * @returns {{ impact_price: number, impact_bps: number, participation_rate: number }}
 */
export function squareRootImpact(params) {
  const {
    price,
    quantity,
    volume,
    volatility,
    impactCoeff = 0.1,
    scale = 6,
  } = params;

  if (!Number.isFinite(price) || price <= 0) {
    return { impact_price: 0, impact_bps: 0, participation_rate: 0 };
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { impact_price: 0, impact_bps: 0, participation_rate: 0 };
  }
  if (!Number.isFinite(volume) || volume <= 0) {
    // No volume — impact is effectively infinite; clamp to full volatility
    const impactPrice = truncateTowardZero(volatility * price * impactCoeff, scale);
    const impactBps = truncateTowardZero((impactPrice / price) * 10000, scale);
    return { impact_price: impactPrice, impact_bps: impactBps, participation_rate: Infinity };
  }
  if (!Number.isFinite(volatility) || volatility <= 0) {
    return { impact_price: 0, impact_bps: 0, participation_rate: truncateTowardZero(quantity / volume, scale) };
  }

  // Participation rate: fraction of bar volume consumed by the order
  const participationRate = quantity / volume;

  // Almgren-Chriss square-root model:
  // impact = σ * sqrt(Q / V) * k
  const impact = volatility * Math.sqrt(participationRate) * impactCoeff;

  // Convert to price units
  const impactPrice = truncateTowardZero(impact * price, scale);

  // Convert to basis points
  const impactBps = truncateTowardZero(impact * 10000, scale);

  return {
    impact_price: impactPrice,
    impact_bps: impactBps,
    participation_rate: truncateTowardZero(participationRate, scale),
  };
}

// ---------------------------------------------------------------------------
// Realized Slippage
// ---------------------------------------------------------------------------

/**
 * Compute realized slippage from a fill relative to the mid-price.
 * @param {number} midPrice — mid-price at time of order
 * @param {number} execPrice — actual execution price
 * @param {string} side — 'BUY' or 'SELL'
 * @returns {number} — slippage in bps (positive = worse execution)
 */
export function realizedSlippageBps(midPrice, execPrice, side) {
  if (!Number.isFinite(midPrice) || midPrice <= 0) return 0;
  if (!Number.isFinite(execPrice) || execPrice <= 0) return 0;

  const diff = execPrice - midPrice;

  // For BUY: paying more than mid = positive slippage (adverse)
  // For SELL: receiving less than mid = positive slippage (adverse)
  if (side === 'BUY') {
    return (diff / midPrice) * 10000;
  } else if (side === 'SELL') {
    return (-diff / midPrice) * 10000;
  }

  return 0;
}

// ---------------------------------------------------------------------------
// Estimate Execution Price
// ---------------------------------------------------------------------------

/**
 * Estimate execution price including market impact.
 * @param {Object} bar — OHLCV bar (must have .open, .high, .low, .close, .volume)
 * @param {string} side — 'BUY' or 'SELL'
 * @param {number} quantity — order quantity (unsigned)
 * @param {Object} [opts]
 * @param {number} [opts.impactCoeff=0.1] — impact calibration coefficient
 * @param {number} [opts.fixedSpreadBps=1] — half-spread in bps
 * @param {number} [opts.scale=6] — truncation scale
 * @returns {{ exec_price: number, impact_bps: number, spread_bps: number, total_slip_bps: number }}
 */
export function estimateExecPrice(bar, side, quantity, opts = {}) {
  const {
    impactCoeff = 0.1,
    fixedSpreadBps = 1,
    scale = 6,
  } = opts;

  // Mid-price from bar
  const midPrice = (bar.high + bar.low) / 2;

  if (midPrice <= 0 || !Number.isFinite(midPrice)) {
    return { exec_price: 0, impact_bps: 0, spread_bps: 0, total_slip_bps: 0 };
  }

  // Estimate bar volatility from high-low range (Parkinson estimator)
  // σ ≈ (ln(H/L)) / sqrt(4 * ln(2))
  const logHL = bar.high > 0 && bar.low > 0 ? Math.log(bar.high / bar.low) : 0;
  const parkinsonVol = logHL / Math.sqrt(4 * Math.LN2);

  // Compute square-root impact
  const { impact_bps: impactBps } = squareRootImpact({
    price: midPrice,
    quantity: Math.abs(quantity),
    volume: bar.volume || 0,
    volatility: parkinsonVol,
    impactCoeff,
    scale,
  });

  // Half-spread cost
  const spreadBps = fixedSpreadBps;

  // Total slippage = impact + half-spread
  const totalSlipBps = truncateTowardZero(impactBps + spreadBps, scale);

  // Compute execution price
  // BUY: pay mid + slippage; SELL: receive mid - slippage
  const slipFraction = totalSlipBps / 10000;
  let execPrice;
  if (side === 'BUY') {
    execPrice = midPrice * (1 + slipFraction);
  } else if (side === 'SELL') {
    execPrice = midPrice * (1 - slipFraction);
  } else {
    execPrice = midPrice;
  }

  return {
    exec_price: truncateTowardZero(execPrice, scale),
    impact_bps: impactBps,
    spread_bps: truncateTowardZero(spreadBps, scale),
    total_slip_bps: totalSlipBps,
  };
}

// ---------------------------------------------------------------------------
// Aggregate Impact Statistics
// ---------------------------------------------------------------------------

/**
 * Aggregate impact statistics for a series of fills.
 * @param {Array} fills — array of { exec_price, price, qty, side }
 *   exec_price: actual execution price
 *   price: mid/reference price at time of fill
 *   qty: fill quantity
 *   side: 'BUY' or 'SELL'
 * @returns {{ avg_impact_bps: number, max_impact_bps: number, total_impact_usd: number }}
 */
export function aggregateImpactStats(fills) {
  if (!Array.isArray(fills) || fills.length === 0) {
    return { avg_impact_bps: 0, max_impact_bps: 0, total_impact_usd: 0 };
  }

  let sumBps = 0;
  let maxBps = 0;
  let totalImpactUsd = 0;
  let count = 0;

  for (let i = 0; i < fills.length; i++) {
    const fill = fills[i];
    const { exec_price, price, qty, side } = fill;

    if (!Number.isFinite(price) || price <= 0) continue;
    if (!Number.isFinite(exec_price) || exec_price <= 0) continue;
    if (!Number.isFinite(qty) || qty <= 0) continue;

    const slipBps = realizedSlippageBps(price, exec_price, side);
    const absBps = Math.abs(slipBps);

    sumBps += absBps;
    if (absBps > maxBps) maxBps = absBps;

    // USD impact = price difference * quantity
    const priceDiff = Math.abs(exec_price - price);
    totalImpactUsd += priceDiff * qty;

    count++;
  }

  const avgBps = count > 0 ? sumBps / count : 0;

  return {
    avg_impact_bps: truncateTowardZero(avgBps, 6),
    max_impact_bps: truncateTowardZero(maxBps, 6),
    total_impact_usd: truncateTowardZero(totalImpactUsd, 6),
  };
}
