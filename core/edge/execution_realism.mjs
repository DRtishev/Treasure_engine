import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { jsonlParse } from './private_fill_contracts.mjs';

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


function loadPrivateFillDataset(provider, datasetId) {
  const dir = path.resolve(`data/private/normalized/${provider}/${datasetId}/chunks`);
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl')).sort();
  let rows = [];
  for (const f of files) {
    rows = rows.concat(jsonlParse(fs.readFileSync(path.join(dir, f), 'utf8')));
  }
  rows.sort((a, b) => a.ts_ms - b.ts_ms || String(a.fill_id).localeCompare(String(b.fill_id)) || a.output_fingerprint.localeCompare(b.output_fingerprint));
  return rows;
}

function buildCalibration(source, mode, seed) {
  const feeBps = source.map((r) => (r.fee / Math.max(1e-9, r.qty * r.price)) * 10000);
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
    fallback_used: mode !== 'REAL'
  };

  const inputsHash = crypto.createHash('sha256').update(JSON.stringify({ seed, mode, source })).digest('hex');
  const outputsHash = crypto.createHash('sha256').update(JSON.stringify({ params, outputs })).digest('hex');

  return { seed, params, outputs, inputs_hash: inputsHash, outputs_hash: outputsHash };
}

export function calibrateMicrostructure(records = [], options = {}) {
  const seed = Number.isFinite(options.seed) ? options.seed : 4242;
  const source = records.length ? records.map((r) => ({
    qty: Number(r.qty),
    price: Number(r.price),
    fee: Number(r.fee ?? r.fees ?? 0),
    latency_ms: Number.isFinite(Number(r.latency_ms)) ? Number(r.latency_ms) : 0,
    fill_id: r.fill_id ?? null
  })) : [
    { qty: 0.4, price: 100, fee: 0.02, latency_ms: 80, fill_id: null },
    { qty: 0.6, price: 100, fee: 0.03, latency_ms: 100, fill_id: null },
    { qty: 0.8, price: 100, fee: 0.05, latency_ms: 130, fill_id: null }
  ];
  const mode = options.mode || (records.length ? 'fills' : 'shadow-proxy');
  return buildCalibration(source, mode, seed);
}

export function calibrateExecutionRealismFromPrivateFills(options = {}) {
  const seed = Number.isFinite(options.seed) ? options.seed : 5050;
  const strict = process.env.EXEC_REALISM_STRICT === '1' || options.strict === true;
  const datasetId = options.fills_dataset_id || '';
  const provider = (options.provider || 'binance').toLowerCase();

  let mode = 'PROXY';
  let source = [
    { qty: 0.4, price: 100, fee: 0.02, latency_ms: 80, fill_id: null },
    { qty: 0.6, price: 100, fee: 0.03, latency_ms: 100, fill_id: null },
    { qty: 0.8, price: 100, fee: 0.05, latency_ms: 130, fill_id: null }
  ];
  const warnings = [];
  let fillsFingerprint = null;

  if (datasetId) {
    const rows = loadPrivateFillDataset(provider, datasetId);
    if (!rows || rows.length === 0) {
      if (strict) throw new Error('EXEC_REALISM_STRICT: requested fills dataset is missing');
      warnings.push('fills_dataset_missing_fallback_proxy');
    } else {
      if (strict && rows.some((r) => !r.fill_id)) throw new Error('EXEC_REALISM_STRICT: fill_id missing in private fills');
      source = rows.map((r) => ({
        qty: Number(r.qty),
        price: Number(r.price),
        fee: Number(r.fee ?? 0),
        latency_ms: 0,
        fill_id: r.fill_id ?? null
      }));
      mode = 'REAL';
      fillsFingerprint = crypto.createHash('sha256').update(JSON.stringify(rows.map((r) => r.output_fingerprint))).digest('hex');
    }
  } else if (strict) {
    throw new Error('EXEC_REALISM_STRICT: fills dataset id required');
  }

  const cal = buildCalibration(source, mode, seed);
  const manifest = {
    schema_version: '1.0.0',
    mode,
    fills_dataset_id: datasetId || null,
    provider,
    strict_mode: strict,
    fills_fingerprint: fillsFingerprint,
    seed,
    params: cal.params,
    inputs_hash: cal.inputs_hash,
    outputs_hash: cal.outputs_hash,
    warnings
  };
  const manifestFp = crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
  return { ...cal, mode, manifest, manifest_fingerprint: manifestFp };
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
