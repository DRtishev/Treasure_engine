/**
 * deterministic_math.mjs — Dependency-free deterministic math utilities
 *
 * Extracted from contracts.mjs to break the ajv dependency chain.
 * backtest/engine.mjs and strategy_bar_enricher.mjs need truncateTowardZero()
 * but NOT ajv. This module has ZERO external dependencies.
 *
 * SSOT: truncateTowardZero lives here. contracts.mjs re-exports for backward compat.
 */

/**
 * Truncate a number toward zero to `scale` decimal places.
 * Deterministic: no banker's rounding, no floating-point jitter.
 * @param {number} value
 * @param {number} scale - decimal places (e.g. 6)
 * @returns {number}
 */
export function truncateTowardZero(value, scale) {
  if (!Number.isFinite(value)) throw new Error('Non-finite number in deterministic payload');
  const factor = 10 ** scale;
  const truncated = value < 0 ? Math.ceil(value * factor) : Math.floor(value * factor);
  return truncated / factor;
}
