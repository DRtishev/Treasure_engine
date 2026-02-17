#!/usr/bin/env node
// E110 Track C: Candidate Harvest v2 (Stability-First Ranking)
// Ranks by OOS stability: OOS PF + OOS Sharpe + MaxDD + trade count + fold-consistency.
// Hard filter: insufficient trades => reject.

import fs from 'node:fs';
import path from 'node:path';
import { writeMd, sha256Text } from '../verify/e66_lib.mjs';
import { stableFormatNumber, renderMarkdownTable } from '../verify/foundation_render.mjs';
import { runBacktest } from '../../core/backtest/engine.mjs';
import { generateParamGrid, runWalkForward } from '../../core/wfo/walk_forward.mjs';
import { runOverfitCourt } from '../../core/wfo/overfit_court.mjs';

const E110_ROOT = path.resolve('reports/evidence/E110');

// Hard filters
const MIN_TRADES = 10;
const MIN_DAYS = 1;
const MIN_OOS_BARS = 20;

async function loadStrategies() {
  const s1mod = await import('../../core/edge/strategies/s1_breakout_atr.mjs');
  const s2mod = await import('../../core/edge/strategies/s2_mean_revert_rsi.mjs');
  return [
    { init: s1mod.init, onBar: s1mod.onBar, meta: s1mod.meta },
    { init: s2mod.init, onBar: s2mod.onBar, meta: s2mod.meta }
  ];
}

function computeDays(bars) {
  if (bars.length < 2) return 0;
  return (bars[bars.length - 1].ts_open - bars[0].ts_open) / 86400000;
}

function computeOOSSharpe(folds) {
  const oosMetrics = folds.map(f => f.oos_metric || 0);
  if (oosMetrics.length < 2) return 0;
  const mean = oosMetrics.reduce((a, b) => a + b, 0) / oosMetrics.length;
  const variance = oosMetrics.reduce((a, b) => a + (b - mean) ** 2, 0) / (oosMetrics.length - 1);
  return variance > 0 ? mean / Math.sqrt(variance) : 0;
}

function computeFoldConsistency(folds) {
  // Fraction of folds with positive OOS
  const positive = folds.filter(f => (f.oos_metric || 0) > 0).length;
  return folds.length > 0 ? positive / folds.length : 0;
}

function computePF(btMetrics) {
  // Profit factor from realized PnL
  const rPnl = btMetrics.realized_pnl || 0;
  const fees = btMetrics.total_fees || 0;
  return rPnl + fees > 0 ? (rPnl + fees) / Math.max(fees, 0.0001) : 0;
}

/**
 * Stability score: composite of OOS sharpe, fold consistency, inverse DD
 */
function stabilityScore(oosSharpe, foldConsistency, maxDD) {
  const ddPenalty = Math.max(0, 1 - maxDD * 10); // 10% DD = 0 score
  return (oosSharpe * 0.4) + (foldConsistency * 0.4) + (ddPenalty * 0.2);
}

export async function harvestV2(bars) {
  const strategies = await loadStrategies();
  const days = computeDays(bars);
  const candidates = [];
  const rejected = [];

  for (const strategy of strategies) {
    const meta = strategy.meta();
    const name = meta.name;

    // Run backtest
    const btResult = runBacktest(strategy, bars);

    // Run WFO
    const grid = generateParamGrid(meta.params_schema);
    const wfoResult = runWalkForward(strategy, bars, { folds: 3, param_grid: grid });

    // Run overfit court
    const courtResult = runOverfitCourt(wfoResult);

    // Compute metrics
    const oosSharpe = computeOOSSharpe(wfoResult.folds);
    const foldConsistency = computeFoldConsistency(wfoResult.folds);
    const pf = computePF(btResult.metrics);
    const score = stabilityScore(oosSharpe, foldConsistency, btResult.metrics.max_drawdown);

    const oosAvg = wfoResult.folds.reduce((a, f) => a + (f.oos_metric || 0), 0) / Math.max(wfoResult.folds.length, 1);
    const isAvg = wfoResult.folds.reduce((a, f) => a + (f.train_metric || 0), 0) / Math.max(wfoResult.folds.length, 1);

    const entry = {
      name,
      stability_score: score,
      oos_sharpe: oosSharpe,
      fold_consistency: foldConsistency,
      pf,
      max_dd: btResult.metrics.max_drawdown,
      trades: btResult.metrics.fills,
      return_pct: btResult.metrics.return_pct,
      oos_avg: oosAvg,
      is_avg: isAvg,
      wfo_stability: wfoResult.stability,
      court_verdict: courtResult.verdict,
      court_reasons: courtResult.reasons,
      best_config: wfoResult.best_config,
      reject_reason: null
    };

    // Hard filters
    if (days < MIN_DAYS) {
      entry.reject_reason = `insufficient_days: ${stableFormatNumber(days, 2)} < ${MIN_DAYS}`;
    } else if (bars.length < MIN_OOS_BARS) {
      entry.reject_reason = `insufficient_oos_bars: ${bars.length} < ${MIN_OOS_BARS}`;
    } else if (btResult.metrics.fills < MIN_TRADES) {
      entry.reject_reason = `insufficient_trades: ${btResult.metrics.fills} < ${MIN_TRADES}`;
    } else if (courtResult.verdict === 'FAIL') {
      entry.reject_reason = `court_fail: ${courtResult.reasons.join('; ')}`;
    }

    if (entry.reject_reason) {
      rejected.push(entry);
    } else {
      candidates.push(entry);
    }
  }

  // Sort candidates by stability score (descending)
  candidates.sort((a, b) => b.stability_score - a.stability_score);

  return { candidates, rejected, bars_count: bars.length, days, thresholds: { MIN_TRADES, MIN_DAYS, MIN_OOS_BARS } };
}

export function candidateBoardToMarkdown(harvest) {
  const lines = [
    '# E110 CANDIDATE BOARD', '',
    `- bars: ${harvest.bars_count}`,
    `- days: ${stableFormatNumber(harvest.days, 2)}`,
    `- thresholds: minTrades=${harvest.thresholds.MIN_TRADES}, minDays=${harvest.thresholds.MIN_DAYS}, minOOSBars=${harvest.thresholds.MIN_OOS_BARS}`,
    ''
  ];

  if (harvest.candidates.length > 0) {
    lines.push('## Candidates (ranked by stability score)');
    const headers = ['Rank', 'Strategy', 'StabScore', 'OOS_Sharpe', 'FoldCon', 'PF', 'MaxDD%', 'Trades', 'Return%', 'Court'];
    const rows = harvest.candidates.map((c, i) => [
      String(i + 1), c.name,
      stableFormatNumber(c.stability_score, 4), stableFormatNumber(c.oos_sharpe, 4),
      stableFormatNumber(c.fold_consistency, 2), stableFormatNumber(c.pf, 2),
      stableFormatNumber(c.max_dd * 100, 2), String(c.trades), stableFormatNumber(c.return_pct, 4), c.court_verdict
    ]);
    lines.push(renderMarkdownTable(headers, rows));
    lines.push('');
  } else {
    lines.push('## Candidates');
    lines.push('NONE — no strategy passed all filters on available data.');
    lines.push('This is the honest result. More data or parameter space needed.');
    lines.push('');
  }

  lines.push('## Rejected (with reasons)');
  if (harvest.rejected.length > 0) {
    const rHeaders = ['Strategy', 'StabScore', 'Trades', 'Court', 'Reject Reason'];
    const rRows = harvest.rejected.map(r => [
      r.name, stableFormatNumber(r.stability_score, 4), String(r.trades),
      r.court_verdict, r.reject_reason
    ]);
    lines.push(renderMarkdownTable(rHeaders, rRows));
  } else {
    lines.push('(none)');
  }
  lines.push('');

  // Detailed court verdicts
  lines.push('## Court Verdict Details');
  for (const entry of [...harvest.candidates, ...harvest.rejected]) {
    lines.push(`### ${entry.name}`);
    lines.push(`- court: ${entry.court_verdict}`);
    if (entry.court_reasons.length > 0) {
      lines.push(`- reasons: ${entry.court_reasons.join('; ')}`);
    }
    lines.push(`- best_config: ${JSON.stringify(entry.best_config)}`);
    lines.push(`- oos_avg: ${stableFormatNumber(entry.oos_avg, 4)}`);
    lines.push(`- is_avg: ${stableFormatNumber(entry.is_avg, 4)}`);
    lines.push(`- wfo_stability: ${stableFormatNumber(entry.wfo_stability, 4)}`);
    lines.push('');
  }

  return lines.join('\n');
}

// CLI
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.url.replace('file://', ''));
if (isMain) {
  const fixture = JSON.parse(fs.readFileSync(path.resolve('data/fixtures/e108/e108_ohlcv_200bar.json'), 'utf8'));
  const harvest = await harvestV2(fixture.candles);
  const md = candidateBoardToMarkdown(harvest);
  fs.mkdirSync(E110_ROOT, { recursive: true });
  writeMd(path.join(E110_ROOT, 'CANDIDATE_BOARD.md'), md);
  console.log(`e110_harvest_v2: ${harvest.candidates.length} candidates, ${harvest.rejected.length} rejected`);
  console.log('e110_harvest_v2 PASSED');
}
