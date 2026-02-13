import crypto from 'node:crypto';
import { runCanaryController } from './canary_runner.mjs';

const SCENARIOS = ['baseline', 'whipsaw', 'vol_expansion', 'liquidity_vacuum', 'gap_down'];

function score(row) {
  const pnlScore = Math.max(0, 100 + row.paper_pnl * 1000);
  const pausePenalty = row.pauses * 8;
  const riskPenalty = row.risk_events * 10;
  return Number(Math.max(0, pnlScore - pausePenalty - riskPenalty).toFixed(4));
}

export function runEpoch53Fitness(baseConfig = {}) {
  const rows = [];
  for (const scenario of SCENARIOS) {
    const shadow = runCanaryController({ ...baseConfig, mode: 'SHADOW', scenario });
    const paper = runCanaryController({ ...baseConfig, mode: 'PAPER', scenario });
    const row = {
      scenario,
      paper_pnl: paper.report.metrics.paper_pnl,
      drawdown_proxy: Number((Math.max(0, -paper.report.metrics.paper_pnl) / 10).toFixed(6)),
      pauses: paper.report.metrics.pause_triggers,
      risk_events: paper.report.metrics.risk_events_count,
      trade_count: paper.report.metrics.trade_count,
      stability_score: paper.fingerprint === runCanaryController({ ...baseConfig, mode: 'PAPER', scenario }).fingerprint ? 1 : 0,
      shadow_fingerprint: shadow.fingerprint,
      paper_fingerprint: paper.fingerprint
    };
    row.scenario_score = score(row);
    rows.push(row);
  }
  rows.sort((a, b) => a.scenario.localeCompare(b.scenario));
  const fitness_score = Number((rows.reduce((a, b) => a + b.scenario_score, 0) / rows.length).toFixed(4));
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify({ rows, fitness_score })).digest('hex');
  return { schema_version: '1.0.0', scenarios: rows, fitness_score, fitness_fingerprint: fingerprint };
}
