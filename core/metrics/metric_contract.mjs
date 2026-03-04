/**
 * metric_contract.mjs — Canonical metric schema for ALL pipeline stages
 *
 * Every stage (backtest, sim, paper, canary, live) MUST output these keys.
 * Additional keys are allowed. Missing required keys = FAIL.
 *
 * Sprint 1 — FINDING-C fix: unified metric vocabulary across pipeline.
 */

export const REQUIRED_METRIC_KEYS = [
  'sharpe',           // number — annualized Sharpe ratio via unified_sharpe
  'max_drawdown',     // number — fraction (0..1), HWM-based
  'total_pnl',        // number — USD absolute
  'trade_count',      // integer — number of completed trades
];

export const OPTIONAL_METRIC_KEYS = [
  'sortino', 'calmar', 'win_rate', 'profit_factor',
  'avg_trade_pnl', 'max_consecutive_loss', 'recovery_factor',
];

/**
 * Validate that metrics object contains all required keys.
 * @param {Object} metrics
 * @param {string} stageLabel — e.g. 'backtest', 'sim', 'canary'
 * @returns {{ valid: boolean, missing: string[], detail: string }}
 */
export function validateMetrics(metrics, stageLabel) {
  const missing = REQUIRED_METRIC_KEYS.filter(k => !(k in metrics));
  if (missing.length > 0) {
    return { valid: false, missing, detail: `${stageLabel}: missing ${missing.join(', ')}` };
  }
  return { valid: true, missing: [], detail: `${stageLabel}: all required keys present` };
}
