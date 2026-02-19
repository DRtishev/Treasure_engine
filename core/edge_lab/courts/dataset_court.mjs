// core/edge_lab/courts/dataset_court.mjs — Dataset Court
// Authority: validate data quality, sufficiency, proxy assumptions, and staleness.
// Any estimated value MUST be flagged UNVERIFIED_PROXY_ASSUMPTION.
// If proxy lacks validation methodology + error bounds + failure modes → BLOCKED.

import { VERDICTS, REASON_CODES } from '../verdicts.mjs';

const MIN_TRADES_DEFAULT = 30;
const MAX_STALENESS_MS_DEFAULT = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * @param {Object} edge - Edge descriptor
 *   edge.trades        {Array}  - Array of trade records
 *   edge.data_sources  {Array}  - Array of { name, type, last_update_ms, is_proxy, proxy_methodology }
 *   edge.bars          {Array}  - Price bars used (optional, for regime checks)
 *   edge.now_ms        {number} - Current timestamp (for staleness check; deterministic)
 * @param {Object} ssot - SSOT config
 * @returns {Object} court report
 */
export function runDatasetCourt(edge, ssot) {
  const reason_codes = [];
  const warnings = [];
  const evidence = {};

  const trades = edge.trades || [];
  const sources = edge.data_sources || [];
  const nowMs = edge.now_ms || 0;

  const minTrades = ssot?.edge_lab?.dataset_court?.min_trade_count ?? MIN_TRADES_DEFAULT;
  const maxStalenessMs = ssot?.edge_lab?.dataset_court?.max_staleness_ms ?? MAX_STALENESS_MS_DEFAULT;

  // ─── 1. Trade count sufficiency ────────────────────────────────────────────
  evidence.trade_count = trades.length;
  evidence.min_trade_count = minTrades;
  if (trades.length < minTrades) {
    reason_codes.push(REASON_CODES.INSUFFICIENT_TRADE_COUNT);
  }

  // ─── 2. Data freshness ────────────────────────────────────────────────────
  for (const src of sources) {
    if (nowMs > 0 && src.last_update_ms != null) {
      const ageMsVal = nowMs - src.last_update_ms;
      if (ageMsVal > maxStalenessMs) {
        warnings.push(`Source '${src.name}' stale: age ${Math.round(ageMsVal / 86400000)}d > limit ${Math.round(maxStalenessMs / 86400000)}d`);
        reason_codes.push(REASON_CODES.DATA_STALENESS);
      }
    }
  }
  evidence.data_sources_checked = sources.length;

  // ─── 3. Proxy assumption validation ──────────────────────────────────────
  const proxySources = sources.filter((s) => s.is_proxy);
  for (const src of proxySources) {
    const missingFields = [];
    if (!src.proxy_methodology) missingFields.push('proxy_methodology');
    if (src.proxy_error_bounds == null) missingFields.push('proxy_error_bounds');
    if (!src.proxy_failure_modes) missingFields.push('proxy_failure_modes');

    if (missingFields.length > 0) {
      warnings.push(
        `UNVERIFIED_PROXY_ASSUMPTION: source '${src.name}' missing: ${missingFields.join(', ')}. Cannot influence verdict.`
      );
      reason_codes.push(REASON_CODES.PROXY_ASSUMPTION_UNVERIFIED);
    }
  }
  evidence.proxy_sources = proxySources.length;

  // ─── 4. Dataset integrity (no NaN/null in critical trade fields) ──────────
  let integrityFail = 0;
  for (const t of trades) {
    if (!Number.isFinite(t.pnl) || !Number.isFinite(t.entry_price)) {
      integrityFail++;
    }
  }
  evidence.integrity_fail_count = integrityFail;
  if (integrityFail > 0) {
    reason_codes.push(REASON_CODES.DATASET_INTEGRITY_FAIL);
  }

  // ─── Verdict ──────────────────────────────────────────────────────────────
  let verdict;
  if (reason_codes.includes(REASON_CODES.INSUFFICIENT_TRADE_COUNT)) {
    verdict = VERDICTS.NEEDS_DATA;
  } else if (
    reason_codes.includes(REASON_CODES.PROXY_ASSUMPTION_UNVERIFIED) ||
    reason_codes.includes(REASON_CODES.DATASET_INTEGRITY_FAIL)
  ) {
    verdict = VERDICTS.BLOCKED;
  } else if (reason_codes.includes(REASON_CODES.DATA_STALENESS)) {
    verdict = VERDICTS.NOT_ELIGIBLE;
  } else {
    verdict = VERDICTS.PIPELINE_ELIGIBLE;
  }

  return {
    court: 'DatasetCourt',
    verdict,
    reason_codes,
    warnings,
    evidence_summary: evidence,
    next_actions: _nextActions(verdict, reason_codes),
  };
}

function _nextActions(verdict, codes) {
  if (verdict === VERDICTS.NEEDS_DATA) return ['Collect more trades (min threshold not met)'];
  if (codes.includes(REASON_CODES.PROXY_ASSUMPTION_UNVERIFIED))
    return ['Document proxy_methodology, error_bounds, failure_modes for all proxy sources'];
  if (codes.includes(REASON_CODES.DATASET_INTEGRITY_FAIL))
    return ['Fix NaN/null in trade records before resubmission'];
  if (codes.includes(REASON_CODES.DATA_STALENESS)) return ['Refresh stale data sources'];
  return ['Dataset validated — proceed to Execution Court'];
}
