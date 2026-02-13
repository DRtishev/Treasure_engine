import crypto from 'node:crypto';
import { runPaperTradingSession } from './paper_trading_harness.mjs';
import { runCanaryController } from '../canary/canary_runner.mjs';

const GRID = [
  { slip_scale: 0.85, size_scale: 0.75 },
  { slip_scale: 1.0, size_scale: 0.8 },
  { slip_scale: 1.15, size_scale: 0.9 },
  { slip_scale: 0.9, size_scale: 1.0 },
  { slip_scale: 1.1, size_scale: 1.0 },
  { slip_scale: 1.25, size_scale: 1.1 }
];

export function runPaperFitnessLabV1(config = {}) {
  const seed = config.seed ?? 5501;
  const market_dataset_id = config.market_dataset_id ?? 'e49_fixture';
  const fills_dataset_id = config.fills_dataset_id ?? 'epoch50_fixture';

  const base = runPaperTradingSession({ market_dataset_id, fills_dataset_id, strict: true, seed, shadow_only: true });

  const all_results = GRID.map((params, idx) => {
    const net_pnl = Number((base.report.metrics.net_pnl * params.size_scale / params.slip_scale).toFixed(8));
    const canary = runCanaryController({
      market_dataset_id,
      fills_dataset_id,
      mode: 'PAPER',
      strict: true,
      seed: seed + idx,
      thresholds: { max_reality_gap: 0.9, max_risk_events: 0, max_exposure_usd: 500 }
    });
    const hard_stops = canary.report.metrics.risk_events_count;
    const score = Number((net_pnl * 100 - hard_stops * 3).toFixed(8));
    return {
      rank_seed: idx,
      params,
      net_pnl,
      hard_stops,
      score,
      fingerprint: crypto.createHash('sha256').update(JSON.stringify({ params, net_pnl, hard_stops, score })).digest('hex')
    };
  }).sort((a, b) => b.score - a.score || a.fingerprint.localeCompare(b.fingerprint));

  return {
    schema_version: '1.0.0',
    score_formula: 'score = net_pnl*100 - hard_stops*3',
    grid_size: GRID.length,
    top_k: all_results.slice(0, 3),
    all_results,
    frontier_fingerprint: crypto.createHash('sha256').update(JSON.stringify(all_results)).digest('hex')
  };
}
