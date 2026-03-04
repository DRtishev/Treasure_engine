/**
 * paper_evidence_chain.mjs — SHA256-Linked Paper Trading Evidence Chain
 *
 * Creates immutable checkpoint chain for paper trading sessions.
 * Each checkpoint links to previous via SHA256 hash.
 * Any tampering breaks the chain.
 *
 * ZERO external dependencies. Deterministic. Offline-safe.
 */

import crypto from 'node:crypto';

/**
 * Create a genesis checkpoint (day 0).
 * @param {Object} opts
 * @param {string} opts.session_id
 * @param {string} opts.strategy
 * @param {string} opts.exchange
 * @returns {Object} Genesis checkpoint
 */
export function createGenesis(opts) {
  const checkpoint = {
    schema_version: '1.0.0',
    session_id: opts.session_id,
    strategy: opts.strategy,
    exchange: opts.exchange || 'testnet',
    day_number: 0,
    metrics: {
      cumulative_trades: 0,
      cumulative_pnl_usd: 0,
      running_sharpe: null,
      max_drawdown_pct: 0,
      win_rate: null,
      avg_trade_duration_hours: null,
    },
    daily_trades: [],
    sha256_previous: 'GENESIS',
    sha256_current: null,
  };
  checkpoint.sha256_current = sha256Checkpoint(checkpoint);
  return checkpoint;
}

/**
 * Create next checkpoint in the chain.
 * @param {Object} previous - Previous checkpoint
 * @param {Object} dailyData
 * @param {number} dailyData.day_number
 * @param {Object} dailyData.metrics - Updated cumulative metrics
 * @param {Array} dailyData.daily_trades - Trades for this day
 * @returns {Object} New checkpoint linked to previous
 */
export function createCheckpoint(previous, dailyData) {
  if (!previous || !previous.sha256_current) {
    throw new Error('Cannot create checkpoint: invalid previous checkpoint');
  }

  const checkpoint = {
    schema_version: '1.0.0',
    session_id: previous.session_id,
    strategy: previous.strategy,
    exchange: previous.exchange,
    day_number: dailyData.day_number,
    metrics: { ...dailyData.metrics },
    daily_trades: dailyData.daily_trades || [],
    sha256_previous: previous.sha256_current,
    sha256_current: null,
  };
  checkpoint.sha256_current = sha256Checkpoint(checkpoint);
  return checkpoint;
}

/**
 * Verify chain integrity from genesis to tip.
 * @param {Array<Object>} chain - Array of checkpoints in order
 * @returns {{ valid: boolean, length: number, breaks: Array<number> }}
 */
export function verifyChain(chain) {
  if (!Array.isArray(chain) || chain.length === 0) {
    return { valid: false, length: 0, breaks: [] };
  }

  const breaks = [];

  // Verify genesis
  if (chain[0].sha256_previous !== 'GENESIS') {
    breaks.push(0);
  }

  // Verify each link
  for (let i = 0; i < chain.length; i++) {
    const cp = chain[i];
    const expected = sha256Checkpoint(cp);
    if (expected !== cp.sha256_current) {
      breaks.push(i);
    }

    // Verify link to previous
    if (i > 0 && cp.sha256_previous !== chain[i - 1].sha256_current) {
      breaks.push(i);
    }
  }

  return {
    valid: breaks.length === 0,
    length: chain.length,
    breaks: [...new Set(breaks)],
  };
}

/**
 * Check if paper trading has met graduation criteria (CT02 guards).
 * @param {Array<Object>} chain
 * @returns {{ eligible: boolean, reason: string, metrics: Object }}
 */
export function checkGraduationEligibility(chain) {
  if (!chain || chain.length === 0) {
    return { eligible: false, reason: 'empty chain', metrics: {} };
  }

  const tip = chain[chain.length - 1];
  const m = tip.metrics;

  const days = tip.day_number;
  const trades = m.cumulative_trades || 0;
  const sharpe = m.running_sharpe;
  const maxDD = m.max_drawdown_pct || 0;

  const checks = {
    days_sufficient: days >= 30,
    trades_sufficient: trades >= 100,
    sharpe_sufficient: sharpe !== null && sharpe > 0.5,
    drawdown_acceptable: maxDD < 15,
    chain_valid: verifyChain(chain).valid,
  };

  const eligible = Object.values(checks).every(v => v);
  const failedChecks = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);

  return {
    eligible,
    reason: eligible ? 'CT02_READY' : `FAILED: ${failedChecks.join(', ')}`,
    metrics: { days, trades, sharpe, maxDD, ...checks },
  };
}

/**
 * Hash a checkpoint (excluding sha256_current field).
 * @param {Object} checkpoint
 * @returns {string} SHA256 hex digest
 */
function sha256Checkpoint(checkpoint) {
  const { sha256_current, ...rest } = checkpoint;
  return crypto.createHash('sha256').update(JSON.stringify(rest)).digest('hex');
}
