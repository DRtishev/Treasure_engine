import crypto from 'node:crypto';

const MODES = new Set(['SHADOW', 'PAPER', 'GUARDED_LIVE']);

function num(v, name) {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid numeric ${name}`);
  return n;
}

export function validateCanaryConfig(input = {}) {
  const cfg = {
    mode: String(input.mode || 'SHADOW').toUpperCase(),
    scenario: String(input.scenario || 'baseline').toLowerCase(),
    market_dataset_id: input.market_dataset_id || 'e49_fixture',
    market_provider: input.market_provider || 'binance',
    fills_dataset_id: input.fills_dataset_id || 'epoch50_fixture',
    fills_provider: input.fills_provider || 'binance',
    seed: Number.isFinite(input.seed) ? input.seed : 5201,
    strict: input.strict === true,
    thresholds: {
      max_reality_gap: num(input.thresholds?.max_reality_gap ?? 0.35, 'thresholds.max_reality_gap'),
      max_risk_events: num(input.thresholds?.max_risk_events ?? 0, 'thresholds.max_risk_events'),
      max_exposure_usd: num(input.thresholds?.max_exposure_usd ?? 500, 'thresholds.max_exposure_usd'),
      max_dd_speed: num(input.thresholds?.max_dd_speed ?? 0.06, 'thresholds.max_dd_speed'),
      max_vol_spike: num(input.thresholds?.max_vol_spike ?? 0.75, 'thresholds.max_vol_spike'),
      max_data_gap_count: num(input.thresholds?.max_data_gap_count ?? 0, 'thresholds.max_data_gap_count')
    },
    kill_switch: {
      enabled: input.kill_switch?.enabled !== false,
      auto_pause_on_crisis: input.kill_switch?.auto_pause_on_crisis !== false
    },
    overfit_metrics_path: input.overfit_metrics_path || 'reports/evidence/EPOCH-43/gates/manual/overfit_metrics.json',
    network_requested: input.network_requested === true,
    crisis_mode: input.crisis_mode === true
  };

  if (!MODES.has(cfg.mode)) throw new Error(`Unsupported mode: ${cfg.mode}`);
  if (cfg.thresholds.max_reality_gap < 0 || cfg.thresholds.max_reality_gap > 1) throw new Error('max_reality_gap out of range');
  if (cfg.thresholds.max_risk_events < 0) throw new Error('max_risk_events must be >= 0');
  if (cfg.thresholds.max_exposure_usd <= 0) throw new Error('max_exposure_usd must be > 0');

  const fingerprint = crypto.createHash('sha256').update(JSON.stringify(cfg)).digest('hex');
  return { config: cfg, config_fingerprint: fingerprint };
}
