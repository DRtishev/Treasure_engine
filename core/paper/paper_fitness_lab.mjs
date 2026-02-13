import crypto from 'node:crypto';
import fs from 'node:fs';
import { runPaperTradingSession } from './paper_trading_harness.mjs';

const GRID = [
  { slip_scale: 0.9, size_scale: 0.8 },
  { slip_scale: 1.0, size_scale: 0.8 },
  { slip_scale: 1.1, size_scale: 0.8 },
  { slip_scale: 0.9, size_scale: 1.0 },
  { slip_scale: 1.0, size_scale: 1.0 },
  { slip_scale: 1.1, size_scale: 1.0 }
];

function score(netPnl, riskEvents) {
  return Number((netPnl * 100 - (riskEvents * 3)).toFixed(6));
}

export function runPaperFitnessLab(config = {}) {
  const base = runPaperTradingSession({ market_dataset_id: 'e49_fixture', fills_dataset_id: 'epoch50_fixture', strict: true, seed: config.seed ?? 5501, shadow_only: true });
  const rows = GRID.map((g, idx) => {
    const net = Number((base.report.metrics.net_pnl * g.size_scale / g.slip_scale).toFixed(8));
    const risk = base.report.metrics.hard_stops_triggered;
    return {
      rank_seed: idx,
      params: g,
      net_pnl: net,
      hard_stops: risk,
      score: score(net, risk),
      fingerprint: crypto.createHash('sha256').update(JSON.stringify({ g, net, risk })).digest('hex')
    };
  }).sort((a, b) => b.score - a.score || a.fingerprint.localeCompare(b.fingerprint));

  const top_k = rows.slice(0, 3);
  const overfit = fs.existsSync('reports/evidence/EPOCH-43/gates/manual/overfit_metrics.json')
    ? { status: 'present', path: 'reports/evidence/EPOCH-43/gates/manual/overfit_metrics.json' }
    : { status: 'unknown', path: null };

  const report = {
    schema_version: '1.0.0',
    grid_size: GRID.length,
    top_k,
    all_results: rows,
    overfit_constraint: overfit,
    frontier_fingerprint: crypto.createHash('sha256').update(JSON.stringify({ rows, overfit })).digest('hex')
  };
  return report;
}
