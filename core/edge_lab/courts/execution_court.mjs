// core/edge_lab/courts/execution_court.mjs — Execution Court
// Doctrine: Backtest profitability is NOT evidence.
// Must model: slippage variability, fee structures, liquidity depth,
//             partial fills, latency effects, volatility spikes.

import { VERDICTS, REASON_CODES } from '../verdicts.mjs';

const DEFAULTS = {
  max_reality_gap: 0.85,
  max_slippage_bps: 15,
  min_fill_rate: 0.90,
  max_latency_ms: 500,
  max_reject_ratio: 0.05,
};

/**
 * @param {Object} edge
 *   edge.execution  {Object} - {
 *     reality_gap:    number  [0..1] — fraction of sim PnL lost in live
 *     slippage_p99_bps: number  — 99th pct slippage in basis points
 *     fill_rate:      number  [0..1] — fraction of orders filled
 *     latency_p99_ms: number  — 99th pct order-to-fill latency ms
 *     reject_ratio:   number  [0..1]
 *     partial_fill_rate: number [0..1]
 *     fee_bps:        number  — per-trade fee in bps
 *   }
 * @param {Object} ssot
 */
export function runExecutionCourt(edge, ssot) {
  const reason_codes = [];
  const warnings = [];
  const evidence = {};

  const ex = edge.execution || {};
  const cfg = ssot?.edge_lab?.execution_court ?? {};

  const maxRealityGap = cfg.max_reality_gap ?? DEFAULTS.max_reality_gap;
  const maxSlippageBps = cfg.max_slippage_bps ?? DEFAULTS.max_slippage_bps;
  const minFillRate = cfg.min_fill_rate ?? DEFAULTS.min_fill_rate;
  const maxLatencyMs = cfg.max_latency_ms ?? DEFAULTS.max_latency_ms;
  const maxRejectRatio = cfg.max_reject_ratio ?? DEFAULTS.max_reject_ratio;

  // ─── 1. Reality gap ────────────────────────────────────────────────────────
  const realityGap = ex.reality_gap ?? 0;
  evidence.reality_gap = realityGap;
  evidence.reality_gap_threshold = maxRealityGap;
  if (realityGap >= maxRealityGap) {
    reason_codes.push(REASON_CODES.REALITY_GAP_CLIFF);
  } else if (realityGap > 0.5) {
    warnings.push(`High reality gap ${(realityGap * 100).toFixed(1)}% — sensitive to execution assumptions`);
  }

  // ─── 2. Slippage ──────────────────────────────────────────────────────────
  const slippageBps = ex.slippage_p99_bps ?? 0;
  evidence.slippage_p99_bps = slippageBps;
  evidence.slippage_threshold_bps = maxSlippageBps;
  if (slippageBps > maxSlippageBps) {
    reason_codes.push(REASON_CODES.SLIPPAGE_EXCESS);
  }

  // ─── 3. Fill rate ──────────────────────────────────────────────────────────
  const fillRate = ex.fill_rate ?? 1.0;
  evidence.fill_rate = fillRate;
  evidence.min_fill_rate = minFillRate;
  if (fillRate < minFillRate) {
    reason_codes.push(REASON_CODES.FILL_RATE_LOW);
  }

  // ─── 4. Latency ────────────────────────────────────────────────────────────
  const latencyMs = ex.latency_p99_ms ?? 0;
  evidence.latency_p99_ms = latencyMs;
  evidence.max_latency_ms = maxLatencyMs;
  if (latencyMs > maxLatencyMs) {
    reason_codes.push(REASON_CODES.LATENCY_EXCESS);
  }

  // ─── 5. Reject ratio ──────────────────────────────────────────────────────
  const rejectRatio = ex.reject_ratio ?? 0;
  evidence.reject_ratio = rejectRatio;
  evidence.max_reject_ratio = maxRejectRatio;
  if (rejectRatio > maxRejectRatio) {
    reason_codes.push(REASON_CODES.FILL_RATE_LOW);
  }

  // ─── 6. Partial fills warning ─────────────────────────────────────────────
  const partialFillRate = ex.partial_fill_rate ?? 0;
  evidence.partial_fill_rate = partialFillRate;
  if (partialFillRate > 0.3) {
    warnings.push(`High partial fill rate ${(partialFillRate * 100).toFixed(1)}% — may distort PnL calculation`);
  }

  // ─── 7. Fee accounting ────────────────────────────────────────────────────
  evidence.fee_bps = ex.fee_bps ?? null;
  if (ex.fee_bps == null) {
    warnings.push('fee_bps not provided — fee structure unverified');
  }

  // ─── Verdict ──────────────────────────────────────────────────────────────
  let verdict;
  if (reason_codes.includes(REASON_CODES.REALITY_GAP_CLIFF)) {
    verdict = VERDICTS.NOT_ELIGIBLE;
  } else if (reason_codes.length > 0) {
    verdict = VERDICTS.NOT_ELIGIBLE;
  } else {
    verdict = VERDICTS.PIPELINE_ELIGIBLE;
  }

  return {
    court: 'ExecutionCourt',
    verdict,
    reason_codes,
    warnings,
    evidence_summary: evidence,
    next_actions: _nextActions(verdict, reason_codes),
  };
}

function _nextActions(verdict, codes) {
  if (verdict === VERDICTS.PIPELINE_ELIGIBLE) return ['Execution reality validated — proceed to Sensitivity Court'];
  const actions = [];
  if (codes.includes(REASON_CODES.REALITY_GAP_CLIFF))
    actions.push('REALITY GAP CLIFF: investigate model assumptions vs live execution discrepancy');
  if (codes.includes(REASON_CODES.SLIPPAGE_EXCESS))
    actions.push('Reduce slippage exposure: tighten limit orders or reduce trade size');
  if (codes.includes(REASON_CODES.FILL_RATE_LOW))
    actions.push('Investigate fill rate / reject ratio — liquidity may be insufficient');
  if (codes.includes(REASON_CODES.LATENCY_EXCESS))
    actions.push('Reduce execution latency or widen entry tolerance');
  return actions.length ? actions : ['Review execution metrics against thresholds'];
}
