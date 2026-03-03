#!/usr/bin/env node
// EPOCH-73: Strategy Bar Enricher — PROXY liquidation signals from OHLCV
//
// Synthesizes _liq_pressure, _burst_score, _regime_flag from raw OHLCV bars.
// IMPORTANT: These are PROXY signals derived from price/volume patterns,
// NOT real exchange liquidation data. Strategies MUST declare this in meta().
//
// Method: Rolling z-score of price*volume impulse. Self-calibrating to any
// timeframe/asset. No fixed scale constants that break across datasets.
//
// Contract:
//   enrichBars(bars) → bars[] with added _liq_pressure, _burst_score, _regime_flag
//   Pure function, deterministic, backward-looking only (no lookahead).
//   Bars with existing _liq_pressure are passed through unchanged.

import { truncateTowardZero } from '../deterministic_math.mjs';

const WINDOW = 20;

/**
 * Enrich OHLCV bars with synthetic liquidation proxy signals.
 * @param {Array} bars - Raw OHLCV bars sorted by ts_open
 * @returns {Array} Enriched bars (new array, original untouched)
 */
export function enrichBars(bars) {
  if (!Array.isArray(bars) || bars.length === 0) return [];

  const n = bars.length;
  const enriched = new Array(n);

  // Pre-compute impulse = |close - open| / open * (volume / avg_volume)
  // This captures "how unusual is this bar's price-move × volume combo"
  const impulses = new Array(n);
  const volumes = new Array(n);

  for (let i = 0; i < n; i++) {
    const b = bars[i];
    volumes[i] = b.volume || 0;
    const priceMove = b.close && b.open ? Math.abs(b.close - b.open) / b.open : 0;
    impulses[i] = priceMove * (b.volume || 0);
  }

  for (let i = 0; i < n; i++) {
    const bar = bars[i];

    // Pass through if already enriched
    if (bar._liq_pressure != null) {
      enriched[i] = bar;
      continue;
    }

    // Rolling window stats (backward-looking only)
    const wStart = Math.max(0, i - WINDOW);
    let volSum = 0, volCount = 0;
    let impSum = 0, impSqSum = 0, impCount = 0;
    for (let j = wStart; j < i; j++) {
      volSum += volumes[j];
      volCount++;
      impSum += impulses[j];
      impSqSum += impulses[j] ** 2;
      impCount++;
    }

    const avgVol = volCount > 0 ? volSum / volCount : volumes[i] || 1;
    const currentVol = volumes[i] || 0;

    // Burst score: volume spike relative to rolling average
    const burstScore = avgVol > 0 ? currentVol / avgVol : 0;

    // Liq pressure via z-score of impulse (self-calibrating)
    let liqPressure = 0;
    if (impCount >= 3) {
      const impMean = impSum / impCount;
      const impVar = (impSqSum / impCount) - impMean ** 2;
      const impStd = Math.sqrt(Math.max(0, impVar));
      if (impStd > 0) {
        const z = (impulses[i] - impMean) / impStd;
        // Sigmoid mapping: z → [0, 1], z=2 → ~0.73, z=3 → ~0.88
        liqPressure = 1 / (1 + Math.exp(-z));
      }
    }
    liqPressure = truncateTowardZero(Math.max(0, Math.min(1, liqPressure)), 6);

    // Regime flag: direction + intensity classification
    const direction = bar.close >= bar.open ? 'BULL' : 'BEAR';
    let regimeFlag = 'NEUTRAL';
    if (liqPressure >= 0.65) {
      regimeFlag = burstScore >= 1.5
        ? `${direction}_LIQ_BURST`
        : `${direction}_LIQ`;
    } else if (liqPressure >= 0.55) {
      regimeFlag = `${direction}_LIQ`;
    }

    // Quality-filter compatible fields (for S5 quality gate)
    const atrProxy = bar.high && bar.low && bar.close
      ? (bar.high - bar.low) / bar.close
      : 0;

    enriched[i] = {
      ...bar,
      _liq_pressure: liqPressure,
      _burst_score: truncateTowardZero(Math.max(0, burstScore), 6),
      _regime_flag: regimeFlag,
      // Quality filter compatibility
      atr_pct: truncateTowardZero(atrProxy, 6),
      volume_usd: truncateTowardZero(currentVol * (bar.close || 0), 2),
      spread_bps: truncateTowardZero(atrProxy * 100, 4),
      volatility: truncateTowardZero(
        bar.close && bar.open ? Math.abs(bar.close - bar.open) / bar.open : 0, 6),
    };
  }

  return enriched;
}
