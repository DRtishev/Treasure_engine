// core/sim/penalized.mjs
// Penalized metrics computation module (P0 hotfix: clamp norms to [0..1] + normalize weights)

function clamp01(x) {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function safeNum(x, fallback = 0) {
  return Number.isFinite(x) ? x : fallback;
}

function normalizeWeights(w) {
  const keys = Object.keys(w);
  let sum = 0;
  for (const k of keys) sum += safeNum(w[k], 0);
  if (sum <= 0) return w;
  const out = {};
  for (const k of keys) out[k] = safeNum(w[k], 0) / sum;
  return out;
}

function normExcess(raw, thr, floorDenom) {
  const r = safeNum(raw, 0);
  const t = safeNum(thr, 0);
  const denom = Math.max(safeNum(floorDenom, 0), t, 1e-12);
  return clamp01((r - t) / denom);
}

/**
 * Compute penalized expectancy with detailed breakdown
 * @param {Object} params
 * @returns {Object} {penalized_expectancy_per_trade, penalty_breakdown}
 */
export function computePenalizedMetrics(params) {
  const expectancy = safeNum(params.expectancy_per_trade, 0);
  const hostileExec = params.hostile_exec || null;
  const hostileMaxDD = safeNum(params.hostile_maxdd, 0);
  const realityGap = safeNum(params.reality_gap, 0);
  const ssot = params.ssot || {};

  const thresholds = ssot.thresholds || {};
  const defaults = {
    reject_ratio: 0.25,
    slippage_p99_bps: 0.20,
    rtt_p99_ms: 0.15,
    max_drawdown_pct: 0.30,
    reality_gap: 0.10
  };
  const weightsRaw = ssot.penalty_weights || defaults;
  const weights = normalizeWeights({
    reject_ratio: safeNum(weightsRaw.reject_ratio, defaults.reject_ratio),
    slippage_p99_bps: safeNum(weightsRaw.slippage_p99_bps, defaults.slippage_p99_bps),
    rtt_p99_ms: safeNum(weightsRaw.rtt_p99_ms, defaults.rtt_p99_ms),
    max_drawdown_pct: safeNum(weightsRaw.max_drawdown_pct, defaults.max_drawdown_pct),
    reality_gap: safeNum(weightsRaw.reality_gap, defaults.reality_gap)
  });

  // If no hostile exec — no penalty (but still return full breakdown for schema stability)
  const rejectRaw = hostileExec ? safeNum(hostileExec.reject_ratio, 0) : 0;
  const slipRaw = hostileExec ? safeNum(hostileExec.slippage_p99_bps, 0) : 0;
  const rttRaw = hostileExec ? safeNum(hostileExec.rtt_p99_ms, 0) : 0;

  const maxReject = safeNum(thresholds.max_reject_ratio, 0.05);
  const maxSlip = safeNum(thresholds.max_slippage_p99_bps, 15);
  const maxRtt = safeNum(thresholds.max_rtt_p99_ms, 800);
  const maxDDThr = safeNum(thresholds.max_penalized_maxdd_pct, 0.18);

  const rejectNorm = normExcess(rejectRaw, maxReject, 0.01);
  const slipNorm = normExcess(slipRaw, maxSlip, 1);
  const rttNorm = normExcess(rttRaw, maxRtt, 10);
  const maxddNorm = normExcess(hostileMaxDD, maxDDThr, 0.01);

  // Reality gap: soft penalty above warn (default 0.5). Clamped to [0..1].
  const gapWarn = safeNum(thresholds.reality_gap_warn, 0.5);
  const gapSpan = Math.max(1e-12, 1 - gapWarn);
  const gapNorm = clamp01((realityGap - gapWarn) / gapSpan);

  const rejectContrib = rejectNorm * weights.reject_ratio;
  const slipContrib = slipNorm * weights.slippage_p99_bps;
  const rttContrib = rttNorm * weights.rtt_p99_ms;
  const maxddContrib = maxddNorm * weights.max_drawdown_pct;
  const gapContrib = gapNorm * weights.reality_gap;

  const total = safeNum(rejectContrib + slipContrib + rttContrib + maxddContrib + gapContrib, 0);

  const penalized = safeNum(expectancy - total, expectancy);

  return {
    penalized_expectancy_per_trade: penalized,
    penalty_breakdown: {
      reject: { raw: rejectRaw, norm: rejectNorm, weight: weights.reject_ratio, contrib: rejectContrib },
      slippage: { raw: slipRaw, norm: slipNorm, weight: weights.slippage_p99_bps, contrib: slipContrib },
      rtt: { raw: rttRaw, norm: rttNorm, weight: weights.rtt_p99_ms, contrib: rttContrib },
      maxdd: { raw: hostileMaxDD, norm: maxddNorm, weight: weights.max_drawdown_pct, contrib: maxddContrib },
      reality_gap: { raw: realityGap, norm: gapNorm, weight: weights.reality_gap, contrib: gapContrib },
      total
    }
  };
}
