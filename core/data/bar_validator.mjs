/**
 * bar_validator.mjs — OHLCV bar invariant validation
 *
 * EPOCH-74: Data Organ Liveness — Requirement R2
 *
 * Validates OHLCV bar invariants:
 *   INV_H_GE_L      — High >= Low
 *   INV_O_IN_RANGE   — Open within [Low, High]
 *   INV_C_IN_RANGE   — Close within [Low, High]
 *   INV_V_NON_NEG    — Volume >= 0
 *   INV_TS_OPEN      — ts_open is finite positive number
 *   INV_TS_ORDER     — ts_close > ts_open
 *   INV_SYMBOL       — symbol is non-empty string
 *   INV_TS_MONOTONIC — Series: ts_open strictly increasing
 *
 * Exports:
 *   validateBar(bar)        → { valid, errors, warnings, bar }
 *   validateBarSeries(bars) → { total, valid, invalid, gaps, results }
 *
 * Surface: DATA (pure — no I/O, no net)
 */

/**
 * Validate a single OHLCV bar.
 * @param {object} bar — { ts_open, ts_close, open, high, low, close, volume, symbol }
 * @returns {{ valid: boolean, errors: string[], warnings: string[], bar: object }}
 */
export function validateBar(bar) {
  const errors = [];
  const warnings = [];

  // INVARIANT 1: High >= Low
  if (bar.high < bar.low) errors.push('INV_H_GE_L');

  // INVARIANT 2: Open and Close within [Low, High]
  if (bar.open < bar.low || bar.open > bar.high) errors.push('INV_O_IN_RANGE');
  if (bar.close < bar.low || bar.close > bar.high) errors.push('INV_C_IN_RANGE');

  // INVARIANT 3: Volume non-negative
  if (bar.volume < 0) errors.push('INV_V_NON_NEG');
  if (bar.volume === 0) warnings.push('WARN_V_ZERO');

  // INVARIANT 4: Timestamps valid
  if (!Number.isFinite(bar.ts_open) || bar.ts_open <= 0) errors.push('INV_TS_OPEN');
  if (bar.ts_close <= bar.ts_open) errors.push('INV_TS_ORDER');

  // INVARIANT 5: Symbol present
  if (!bar.symbol || typeof bar.symbol !== 'string') errors.push('INV_SYMBOL');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    bar,
  };
}

/**
 * Validate a series of OHLCV bars.
 * @param {object[]} bars
 * @returns {{ total: number, valid: number, invalid: number, gaps: object[], results: object[] }}
 */
export function validateBarSeries(bars) {
  const results = bars.map((b, i) => ({ ...validateBar(b), index: i }));
  const gaps = [];

  // SERIES CHECK 1: Monotonic timestamps
  for (let i = 1; i < bars.length; i++) {
    if (bars[i].ts_open <= bars[i - 1].ts_open) {
      results[i].errors.push('INV_TS_MONOTONIC');
      results[i].valid = false;
    }
  }

  // SERIES CHECK 2: Gap detection (missing bars)
  for (let i = 1; i < bars.length; i++) {
    const expected = bars[i - 1].ts_close;
    const actual = bars[i].ts_open;
    const barDuration = bars[i].ts_close - bars[i].ts_open;
    if (actual > expected + barDuration) {
      gaps.push({ after_index: i - 1, gap_ms: actual - expected });
    }
  }

  // SERIES CHECK 3: Outlier detection (price jump > 10% in one bar)
  for (let i = 1; i < bars.length; i++) {
    if (bars[i - 1].close === 0) continue;
    const pctChange = Math.abs(bars[i].close - bars[i - 1].close) / bars[i - 1].close;
    if (pctChange > 0.10) results[i].warnings.push('WARN_OUTLIER_JUMP');
  }

  const invalidCount = results.filter((r) => !r.valid).length;
  return {
    total: bars.length,
    valid: bars.length - invalidCount,
    invalid: invalidCount,
    gaps,
    results: results.filter((r) => !r.valid || r.warnings.length > 0),
  };
}
