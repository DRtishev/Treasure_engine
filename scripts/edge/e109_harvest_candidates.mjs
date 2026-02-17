#!/usr/bin/env node
// E109 Track C1: Strategy Harvest Runner
// Runs backtest + WFO + overfit court on capsule data.
// Output: STRATEGY_SCOREBOARD.md with honest metrics.

import fs from 'node:fs';
import path from 'node:path';
import { writeMd, sha256Text } from '../verify/e66_lib.mjs';
import { stableFormatNumber, renderMarkdownTable } from '../verify/foundation_render.mjs';
import { runBacktest, backtestToMarkdown } from '../../core/backtest/engine.mjs';
import { generateParamGrid, runWalkForward, wfoToMarkdown } from '../../core/wfo/walk_forward.mjs';
import { runOverfitCourt, overfitCourtToMarkdown } from '../../core/wfo/overfit_court.mjs';
import { loadCapsuleBars } from '../data/e109_capsule_build.mjs';

const E109_ROOT = path.resolve('reports/evidence/E109');

// Minimum reality thresholds (C2)
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
  return (bars[bars.length - 1].ts_open - bars[0].ts_open) / (24 * 60 * 60 * 1000);
}

function computeSharpeProxy(returns) {
  if (returns.length < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / (returns.length - 1);
  const std = Math.sqrt(variance);
  return std > 0 ? mean / std : 0;
}

function computeWinRate(fills) {
  if (fills.length < 2) return 0;
  let wins = 0;
  let trades = 0;
  for (let i = 1; i < fills.length; i += 2) {
    trades++;
    const pnl = fills[i].side === 'SELL'
      ? (fills[i].price - fills[i - 1].price) * fills[i - 1].qty
      : (fills[i - 1].price - fills[i].price) * fills[i].qty;
    if (pnl > 0) wins++;
  }
  return trades > 0 ? wins / trades : 0;
}

function computeProfitFactor(fills) {
  let grossProfit = 0;
  let grossLoss = 0;
  for (let i = 1; i < fills.length; i += 2) {
    const pnl = fills[i].side === 'SELL'
      ? (fills[i].price - fills[i - 1].price) * fills[i - 1].qty
      : (fills[i - 1].price - fills[i].price) * fills[i].qty;
    if (pnl > 0) grossProfit += pnl;
    else grossLoss += Math.abs(pnl);
  }
  return grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
}

export async function harvestCandidates(bars, opts = {}) {
  const strategies = await loadStrategies();
  const days = computeDays(bars);
  const results = [];

  for (const strategy of strategies) {
    const meta = strategy.meta();
    const name = meta.name;

    // Check minimum reality thresholds
    const dataInsufficient = days < MIN_DAYS || bars.length < MIN_OOS_BARS;

    // Run backtest with default params
    const btResult = runBacktest(strategy, bars);

    // Run WFO
    const grid = generateParamGrid(meta.params_schema);
    const wfoResult = runWalkForward(strategy, bars, {
      folds: 3,
      param_grid: grid
    });

    // Run overfit court
    const courtResult = runOverfitCourt(wfoResult);

    // Compute scoreboard metrics
    const fills = btResult.ledger ? btResult.ledger.fills || [] : [];
    const pf = computeProfitFactor(fills);
    const winRate = computeWinRate(fills);
    const sharpeProxy = computeSharpeProxy(
      wfoResult.folds.map(f => f.oos_metric || 0)
    );

    let verdict;
    if (dataInsufficient) verdict = 'INSUFFICIENT_DATA';
    else if (btResult.metrics.fills < MIN_TRADES) verdict = 'INSUFFICIENT_DATA';
    else if (courtResult.verdict === 'PASS') verdict = 'PASS';
    else verdict = 'FAIL';

    results.push({
      name,
      verdict,
      backtest: btResult.metrics,
      wfo: {
        best_config: wfoResult.best_config,
        stability: wfoResult.stability,
        folds: wfoResult.folds.length
      },
      court: courtResult,
      scoreboard: {
        pf: pf === Infinity ? 'Inf' : stableFormatNumber(pf, 2),
        sharpe_proxy: stableFormatNumber(sharpeProxy, 4),
        max_dd: stableFormatNumber(btResult.metrics.max_drawdown * 100, 2),
        win_rate: stableFormatNumber(winRate * 100, 1),
        trades: btResult.metrics.fills,
        return_pct: stableFormatNumber(btResult.metrics.return_pct, 4),
        oos_avg: stableFormatNumber(
          wfoResult.folds.reduce((a, f) => a + (f.oos_metric || 0), 0) / Math.max(wfoResult.folds.length, 1), 4
        ),
        is_avg: stableFormatNumber(
          wfoResult.folds.reduce((a, f) => a + (f.train_metric || 0), 0) / Math.max(wfoResult.folds.length, 1), 4
        )
      }
    });
  }

  return { results, bars_count: bars.length, days, thresholds: { MIN_TRADES, MIN_DAYS, MIN_OOS_BARS } };
}

export function scoreboardToMarkdown(harvest) {
  const lines = [
    '# E109 STRATEGY SCOREBOARD', '',
    `- bars: ${harvest.bars_count}`,
    `- days: ${stableFormatNumber(harvest.days, 2)}`,
    `- min_trades: ${harvest.thresholds.MIN_TRADES}`,
    `- min_days: ${harvest.thresholds.MIN_DAYS}`,
    `- min_oos_bars: ${harvest.thresholds.MIN_OOS_BARS}`,
    ''
  ];

  const headers = ['Strategy', 'Verdict', 'PF', 'Sharpe', 'MaxDD%', 'WinRate%', 'Trades', 'Return%', 'OOS_avg', 'IS_avg'];
  const rows = harvest.results.map(r => [
    r.name, r.verdict,
    r.scoreboard.pf, r.scoreboard.sharpe_proxy, r.scoreboard.max_dd,
    r.scoreboard.win_rate, String(r.scoreboard.trades), r.scoreboard.return_pct,
    r.scoreboard.oos_avg, r.scoreboard.is_avg
  ]);
  lines.push(renderMarkdownTable(headers, rows));
  lines.push('');

  for (const r of harvest.results) {
    lines.push(`## ${r.name}`);
    lines.push(`- verdict: ${r.verdict}`);
    lines.push(`- court: ${r.court.verdict}`);
    if (r.court.reasons.length > 0) {
      lines.push(`- court_reasons: ${r.court.reasons.join('; ')}`);
    }
    lines.push(`- wfo_stability: ${stableFormatNumber(r.wfo.stability, 4)}`);
    lines.push(`- wfo_folds: ${r.wfo.folds}`);
    lines.push(`- best_config: ${JSON.stringify(r.wfo.best_config)}`);
    lines.push('');
  }

  // Determinism proof
  const content = lines.join('\n');
  lines.push(`## Determinism`);
  lines.push(`- scoreboard_hash: ${sha256Text(content)}`);
  lines.push('');

  return lines.join('\n');
}

// CLI/script mode
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.url.replace('file://', ''));
if (isMain) {
  const capsuleDir = process.argv[2] || path.resolve('data/capsules/fixture_btcusdt_5m_200bar');
  let bars;
  if (fs.existsSync(capsuleDir)) {
    bars = loadCapsuleBars(capsuleDir);
  } else {
    // Fall back to E108 fixture
    const fixture = JSON.parse(fs.readFileSync(path.resolve('data/fixtures/e108/e108_ohlcv_200bar.json'), 'utf8'));
    bars = fixture.candles;
  }

  const harvest = await harvestCandidates(bars);
  const md = scoreboardToMarkdown(harvest);
  fs.mkdirSync(E109_ROOT, { recursive: true });
  writeMd(path.join(E109_ROOT, 'STRATEGY_SCOREBOARD.md'), md);
  console.log(`e109_harvest: ${harvest.results.length} strategies evaluated`);
  for (const r of harvest.results) {
    console.log(`  ${r.name}: ${r.verdict} (PF=${r.scoreboard.pf} DD=${r.scoreboard.max_dd}%)`);
  }
  console.log('e109_harvest PASSED');
}
