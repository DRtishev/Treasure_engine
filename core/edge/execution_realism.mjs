import crypto from 'node:crypto';

function round(value, scale = 6) {
  const p = 10 ** scale;
  return Math.round(value * p) / p;
}

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

export function calibrateMicrostructure(records = [], options = {}) {
  const seed = Number.isFinite(options.seed) ? options.seed : 4242;
  const mode = options.mode || (records.length ? 'fills' : 'shadow-proxy');

  const source = records.length ? records : [
    { qty: 0.4, price: 100, fees: 0.02, latency_ms: 80 },
    { qty: 0.6, price: 100, fees: 0.03, latency_ms: 100 },
    { qty: 0.8, price: 100, fees: 0.05, latency_ms: 130 }
  ];

  const feeBps = source.map((r) => (r.fees / Math.max(1e-9, r.qty * r.price)) * 10000);
  const latency = source.map((r) => Number.isFinite(r.latency_ms) ? r.latency_ms : 0).filter((v) => v >= 0);
  const qty = source.map((r) => r.qty);

  const params = {
    slip_mean_bps: round(median(feeBps) * 0.8 + median(qty) * 0.2, 6),
    slip_std_bps: round(Math.max(0.01, median(feeBps) * 0.15), 6),
    latency_mean_ms: round(median(latency), 4),
    latency_std_ms: round(Math.max(1, median(latency) * 0.2), 4)
  };

  const outputs = {
    sample_count: source.length,
    calibration_mode: mode,
    fallback_used: !records.length
  };

  const inputsHash = crypto.createHash('sha256').update(JSON.stringify({ seed, mode, source })).digest('hex');
  const outputsHash = crypto.createHash('sha256').update(JSON.stringify({ params, outputs })).digest('hex');

  return { seed, params, outputs, inputs_hash: inputsHash, outputs_hash: outputsHash };
}

const BUCKETS = [
  { name: 'HIGH', min_adv: 1_000_000_000, fill_min: 0.95, fill_max: 1.0 },
  { name: 'MID', min_adv: 100_000_000, fill_min: 0.7, fill_max: 0.95 },
  { name: 'LOW', min_adv: 10_000_000, fill_min: 0.4, fill_max: 0.7 },
  { name: 'MICRO', min_adv: 0, fill_min: 0.1, fill_max: 0.4 }
];

export function liquidityBucketForAdv(advUsd) {
  const v = Number(advUsd);
  if (!Number.isFinite(v) || v < 0) throw new Error(`Invalid ADV: ${advUsd}`);
  return BUCKETS.find((b) => v >= b.min_adv) || BUCKETS.at(-1);
}

export function deterministicPartialFill(orderUsd, advUsd) {
  const order = Number(orderUsd);
  if (!Number.isFinite(order) || order <= 0) throw new Error(`Invalid order size: ${orderUsd}`);
  const bucket = liquidityBucketForAdv(advUsd);
  const participation = Math.min(1, order / Math.max(1, advUsd * 0.001));
  const ratio = bucket.fill_max - (bucket.fill_max - bucket.fill_min) * participation;
  const fill_ratio = round(Math.max(bucket.fill_min, Math.min(bucket.fill_max, ratio)), 6);
  const filled_usd = round(order * fill_ratio, 6);
  return {
    bucket: bucket.name,
    order_usd: order,
    participation,
    fill_ratio,
    filled_usd,
    unfilled_usd: round(order - filled_usd, 6)
  };
}

const STRATEGY_STALENESS = {
  HFT: { max_staleness_ms: 500, threshold: 0.7, mode: 'BLOCK' },
  SWING: { max_staleness_ms: 5 * 60 * 1000, threshold: 0.4, mode: 'DOWNWEIGHT' },
  POSITION: { max_staleness_ms: 60 * 60 * 1000, threshold: 0.2, mode: 'DOWNWEIGHT' },
  DEFAULT: { max_staleness_ms: 60_000, threshold: 0.5, mode: 'DOWNWEIGHT' }
};

export function scoreSignalFreshness(signal, context = {}) {
  const nowMs = Number.isFinite(context.now_ms) ? context.now_ms : null;
  if (!Number.isFinite(nowMs)) throw new Error('freshness scoring requires injected now_ms');
  const signalMs = Date.parse(signal.timestamp);
  if (!Number.isFinite(signalMs)) throw new Error('signal timestamp invalid');

  const profile = STRATEGY_STALENESS[signal.strategy_class || 'DEFAULT'] || STRATEGY_STALENESS.DEFAULT;
  const age_ms = Math.max(0, nowMs - signalMs);
  const freshness_score = round(Math.max(0, 1 - (age_ms / profile.max_staleness_ms)), 6);

  let action = 'ALLOW';
  if (freshness_score < profile.threshold) {
    action = profile.mode === 'BLOCK' ? 'BLOCK' : 'DOWNWEIGHT';
  }

  return { age_ms, freshness_score, action, profile };
}
