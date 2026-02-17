#!/usr/bin/env node
// E108 Track 1: Strategy Interface Protocol
// Defines the contract every strategy must follow.
// Key invariant: NO LOOKAHEAD — strategy only sees bars[0..currentIndex].

/**
 * Strategy interface specification:
 *
 * init(config) -> state
 *   Initialize internal state. Called once before bars.
 *
 * onBar(bar, state, history) -> { signal, state }
 *   bar: { ts_open, open, high, low, close, volume, symbol }
 *   state: opaque state from previous call
 *   history: bars seen SO FAR (0..current), NOT future bars
 *   signal: 'BUY' | 'SELL' | 'HOLD'
 *
 * meta() -> { name, version, params_schema, default_params, description }
 */

/**
 * Validate that a strategy implements the required interface
 */
export function validateStrategy(strategy) {
  const errors = [];
  if (typeof strategy.init !== 'function') errors.push('missing init(config)');
  if (typeof strategy.onBar !== 'function') errors.push('missing onBar(bar, state, history)');
  if (typeof strategy.meta !== 'function') errors.push('missing meta()');

  const m = strategy.meta();
  if (!m.name) errors.push('meta().name required');
  if (!m.version) errors.push('meta().version required');
  if (!m.params_schema) errors.push('meta().params_schema required');
  if (!m.default_params) errors.push('meta().default_params required');

  return { valid: errors.length === 0, errors };
}

/**
 * Run a strategy on bars array with NO-LOOKAHEAD enforcement.
 * The strategy only receives history up to current bar index.
 * @param {Object} strategy - Strategy implementing the interface
 * @param {Array} bars - OHLCV bars array (sorted by ts_open)
 * @param {Object} params - Strategy params (override defaults)
 * @returns {{ signals: Array, state: Object }}
 */
export function runStrategyOnBars(strategy, bars, params = {}) {
  const config = { ...strategy.meta().default_params, ...params };
  let state = strategy.init(config);
  const signals = [];

  for (let i = 0; i < bars.length; i++) {
    // NO-LOOKAHEAD: history is bars[0..i] (inclusive), never bars[i+1..]
    const history = bars.slice(0, i + 1);
    const result = strategy.onBar(bars[i], state, history);
    state = result.state;
    signals.push({
      index: i,
      ts: bars[i].ts_open,
      signal: result.signal,
      price: bars[i].close
    });
  }

  return { signals, state };
}

/**
 * Generate a Strategy Card (markdown) from strategy meta + run results
 */
export function generateStrategyCard(strategy, runResult, bars) {
  const m = strategy.meta();
  const buyCount = runResult.signals.filter(s => s.signal === 'BUY').length;
  const sellCount = runResult.signals.filter(s => s.signal === 'SELL').length;
  const holdCount = runResult.signals.filter(s => s.signal === 'HOLD').length;

  return [
    `### ${m.name} v${m.version}`,
    `- description: ${m.description || 'N/A'}`,
    `- params: ${JSON.stringify(m.default_params)}`,
    `- bars: ${bars.length}`,
    `- signals: BUY=${buyCount} SELL=${sellCount} HOLD=${holdCount}`,
    `- assumptions: ${m.assumptions || 'Trend-following or mean-reversion behavior in liquid markets'}`,
    `- failure_modes: ${m.failure_modes || 'Choppy/sideways markets, gap events, low liquidity'}`,
    ''
  ].join('\n');
}
