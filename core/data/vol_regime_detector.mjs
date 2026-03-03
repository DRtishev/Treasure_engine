/**
 * vol_regime_detector.mjs — Live volatility regime classification
 *
 * EPOCH-74: Data Organ Liveness — Requirement R3
 *
 * Computes realized volatility from log returns of OHLCV bars
 * and classifies into regime: LOW / MID / HIGH / CRISIS.
 *
 * Replaces hardcoded vol_regime='MID' in risk_fortress.mjs.
 *
 * Constants match risk_fortress.mjs VOL_MULT map:
 *   LOW:    vol <= 1.5% annualized
 *   MID:    vol <= 3.5% annualized
 *   HIGH:   vol <= 7.0% annualized
 *   CRISIS: vol > 7.0% annualized
 *
 * Exports:
 *   detectVolRegime(bars, opts?) → { regime, realized_vol, stddev, lookback_bars, confidence }
 *   VOL_THRESHOLDS               — threshold constants
 *
 * Surface: DATA (pure — no I/O, no net)
 */

export const VOL_THRESHOLDS = {
  LOW_MAX: 0.015,    // annualized vol <= 1.5% → LOW
  MID_MAX: 0.035,    // annualized vol <= 3.5% → MID
  HIGH_MAX: 0.070,   // annualized vol <= 7.0% → HIGH
  CRISIS_MIN: 0.070, // annualized vol > 7.0% → CRISIS
};

const LOOKBACK_BARS = 20;
const ANNUALIZATION_FACTOR = Math.sqrt(365 * 24); // for 1h bars

/**
 * Detect volatility regime from a series of OHLCV bars.
 * @param {object[]} bars — array of { close } bars
 * @param {object} [opts]
 * @param {number} [opts.lookback=20] — number of bars to use
 * @param {object} [opts.thresholds] — override VOL_THRESHOLDS
 * @returns {{ regime: string, realized_vol: number, stddev: number, lookback_bars: number, confidence: number }}
 */
export function detectVolRegime(bars, opts = {}) {
  const {
    lookback = LOOKBACK_BARS,
    thresholds = VOL_THRESHOLDS,
  } = opts;

  if (bars.length < 2) return { regime: 'MID', realized_vol: 0, stddev: 0, lookback_bars: 0, confidence: 0 };

  // Compute log returns from recent bars
  const recent = bars.slice(-lookback);
  const returns = [];
  for (let i = 1; i < recent.length; i++) {
    if (recent[i - 1].close <= 0 || recent[i].close <= 0) continue;
    returns.push(Math.log(recent[i].close / recent[i - 1].close));
  }

  if (returns.length === 0) return { regime: 'MID', realized_vol: 0, stddev: 0, lookback_bars: 0, confidence: 0 };

  // Realized volatility (annualized)
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.length > 1
    ? returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1)
    : 0;
  const stddev = Math.sqrt(variance);
  const realized_vol = stddev * ANNUALIZATION_FACTOR;

  // Classify regime
  let regime;
  if (realized_vol <= thresholds.LOW_MAX) regime = 'LOW';
  else if (realized_vol <= thresholds.MID_MAX) regime = 'MID';
  else if (realized_vol <= thresholds.HIGH_MAX) regime = 'HIGH';
  else regime = 'CRISIS';

  // Confidence: higher with more data points
  const confidence = Math.min(1.0, returns.length / lookback);

  return {
    regime,
    realized_vol: Math.round(realized_vol * 1e6) / 1e6,
    stddev: Math.round(stddev * 1e6) / 1e6,
    lookback_bars: returns.length,
    confidence: Math.round(confidence * 100) / 100,
  };
}
