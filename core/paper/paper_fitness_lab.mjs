import crypto from 'node:crypto';
import fs from 'node:fs';
import { runPaperTradingSession } from './paper_trading_harness.mjs';
import { runCanaryController } from '../canary/canary_runner.mjs';
import { enforceTierPolicy } from '../data/dataset_tier_policy.mjs';

const GRID = [
  { slip_scale: 0.85, size_scale: 0.75 },
  { slip_scale: 1.0, size_scale: 0.8 },
  { slip_scale: 1.15, size_scale: 0.9 },
  { slip_scale: 0.9, size_scale: 1.0 },
  { slip_scale: 1.1, size_scale: 1.0 },
  { slip_scale: 1.25, size_scale: 1.1 }
];

function maxDrawdownFromCurve(points) {
  let peak = 0;
  let maxDd = 0;
  for (const p of points) {
    if (p > peak) peak = p;
    const dd = peak > 0 ? (peak - p) / peak : 0;
    if (dd > maxDd) maxDd = dd;
  }
  return Number(maxDd.toFixed(8));
}

function scoreV2(metrics) {
  const ddPenalty = metrics.max_dd * 600;
  const riskPenalty = metrics.risk_events_count * 7;
  const pausePenalty = metrics.pause_count * 4;
  const stabilityPenalty = metrics.stability_penalty * 100;
  const qualityPenalty = metrics.data_quality_penalty * 100;
  const tradeReward = Math.min(2.5, metrics.trade_count * 0.2);
  const base = (metrics.pnl_net * 180) - ddPenalty + tradeReward - riskPenalty - pausePenalty - stabilityPenalty - qualityPenalty;
  const score = Number(base.toFixed(6));
  const clamped = Number.isFinite(score) ? score : -999999;
  return {
    score: clamped,
    formula: 'fitness = pnl_net*180 - max_dd*600 + min(2.5,trade_count*0.2) - risk_events_count*7 - pause_count*4 - stability_penalty*100 - data_quality_penalty*100',
    clamp_reason: Number.isFinite(score) ? null : 'NON_FINITE_SCORE'
  };
}

function scenarioScale(index) {
  return {
    pnl: Number((0.75 + (index * 0.13)).toFixed(4)),
    dd: Number((1.0 + (index * 0.08)).toFixed(4)),
    stability: Number((0.02 + (index * 0.01)).toFixed(4)),
    quality: Number((0.01 + (index * 0.005)).toFixed(4))
  };
}

export function runPaperFitnessLab(config = {}) {
  const market_dataset_id = config.market_dataset_id ?? 'e49_fixture';
  const fills_dataset_id = config.fills_dataset_id ?? 'epoch50_fixture';
  const policy = enforceTierPolicy({ market_dataset_id, fills_dataset_id, purpose: config.purpose ?? 'tuning', strict: config.strict ?? true });

  const base = runPaperTradingSession({
    market_dataset_id,
    fills_dataset_id,
    strict: true,
    seed: config.seed ?? 5501,
    shadow_only: true
  });

  const rows = GRID.map((g, idx) => {
    const scale = scenarioScale(idx);
    const pnlNet = Number((base.report.metrics.net_pnl * g.size_scale / g.slip_scale * scale.pnl).toFixed(8));
    const tradeCount = Math.max(0, Math.round(base.report.metrics.paper_fills * g.size_scale));
    const curve = [0, 0.4, 0.1, 0.55, 0.2, 0.9].map((p) => Number((Math.max(0, p * Math.abs(pnlNet) * scale.dd)).toFixed(8)));
    const maxDd = maxDrawdownFromCurve(curve);

    const canary = runCanaryController({
      market_dataset_id,
      fills_dataset_id,
      strict: true,
      mode: 'PAPER',
      seed: (config.seed ?? 5501) + idx,
      scenario: idx % 2 === 0 ? 'baseline' : 'whipsaw',
      thresholds: { max_reality_gap: 0.9, max_risk_events: 0, max_exposure_usd: 500 }
    });

    const metrics = {
      pnl_net: pnlNet,
      max_dd: maxDd,
      trade_count: tradeCount,
      pause_count: canary.report.metrics.pause_triggers,
      risk_events_count: canary.report.metrics.risk_events_count,
      stability_penalty: Number((scale.stability * g.slip_scale).toFixed(8)),
      data_quality_penalty: Number((scale.quality * (2 - g.size_scale)).toFixed(8))
    };

    const s = scoreV2(metrics);
    return {
      rank_seed: idx,
      params: g,
      metrics,
      fitness_score: s.score,
      score_formula: s.formula,
      clamp_reason: s.clamp_reason,
      fingerprint: crypto.createHash('sha256').update(JSON.stringify({ g, metrics, score: s.score })).digest('hex')
    };
  }).sort((a, b) => b.fitness_score - a.fitness_score || a.fingerprint.localeCompare(b.fingerprint));

  const top_k = rows.slice(0, 3);
  const overfit = fs.existsSync('reports/evidence/EPOCH-43/gates/manual/overfit_metrics.json')
    ? { status: 'present', path: 'reports/evidence/EPOCH-43/gates/manual/overfit_metrics.json' }
    : { status: 'unknown', path: null };

  const report = {
    schema_version: '2.0.0',
    policy,
    grid_size: GRID.length,
    top_k,
    all_results: rows,
    overfit_constraint: overfit,
    frontier_fingerprint: crypto.createHash('sha256').update(JSON.stringify({ rows, overfit, policy })).digest('hex')
  };
  return report;
}
