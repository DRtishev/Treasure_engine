#!/usr/bin/env node
// E108 Track 3: Walk-Forward Optimization
// Rolling windows: train -> validate (OOS)
// Grid search within bounded param space
// Outputs top-k configs + stability metrics

import { runBacktest } from '../backtest/engine.mjs';
import { stableFormatNumber } from '../../scripts/verify/foundation_render.mjs';

/**
 * Generate a parameter grid from param schema
 * @param {Object} schema - { param_name: { min, max, step } }
 * @returns {Array} Array of param combination objects
 */
export function generateParamGrid(schema) {
  const keys = Object.keys(schema).sort();
  const ranges = keys.map(k => {
    const s = schema[k];
    const values = [];
    for (let v = s.min; v <= s.max; v += (s.step || 1)) {
      values.push(Math.round(v * 1000) / 1000);
    }
    return { key: k, values };
  });

  // Cartesian product
  let combos = [{}];
  for (const { key, values } of ranges) {
    const next = [];
    for (const combo of combos) {
      for (const v of values) {
        next.push({ ...combo, [key]: v });
      }
    }
    combos = next;
  }

  return combos;
}

/**
 * Run walk-forward optimization
 * @param {Object} strategy - Strategy implementing interface
 * @param {Array} bars - Full bars dataset
 * @param {Object} opts - { train_pct, folds, param_grid, metric, initial_capital, fee_bps, slip_bps, position_size_usd }
 * @returns {Object} { folds: Array, best_config, stability, all_configs }
 */
export function runWalkForward(strategy, bars, opts = {}) {
  const train_pct = opts.train_pct || 0.6;
  const folds = opts.folds || 3;
  const paramGrid = opts.param_grid || [];
  const metric = opts.metric || 'return_pct';
  const btOpts = {
    initial_capital: opts.initial_capital || 10000,
    fee_bps: opts.fee_bps || 4,
    slip_bps: opts.slip_bps || 2,
    position_size_usd: opts.position_size_usd || 500
  };

  if (paramGrid.length === 0) return { folds: [], best_config: null, stability: 0, all_configs: [] };

  const foldSize = Math.floor(bars.length / folds);
  const foldResults = [];

  for (let f = 0; f < folds; f++) {
    const foldStart = f * foldSize;
    const trainEnd = foldStart + Math.floor(foldSize * train_pct);
    const foldEnd = Math.min(foldStart + foldSize, bars.length);

    const trainBars = bars.slice(foldStart, trainEnd);
    const oosBars = bars.slice(trainEnd, foldEnd);

    if (trainBars.length < 10 || oosBars.length < 5) continue;

    // Grid search on train
    let bestTrainMetric = -Infinity;
    let bestParams = paramGrid[0];
    const trainResults = [];

    for (const params of paramGrid) {
      const r = runBacktest(strategy, trainBars, { ...btOpts, params });
      const val = r.metrics[metric] || 0;
      trainResults.push({ params, metric_value: val });
      if (val > bestTrainMetric) {
        bestTrainMetric = val;
        bestParams = params;
      }
    }

    // Validate best params on OOS
    const oosResult = runBacktest(strategy, oosBars, { ...btOpts, params: bestParams });

    foldResults.push({
      fold: f,
      train_bars: trainBars.length,
      oos_bars: oosBars.length,
      best_params: bestParams,
      train_metric: bestTrainMetric,
      oos_metric: oosResult.metrics[metric] || 0,
      oos_metrics: oosResult.metrics
    });
  }

  // Aggregate: find most stable config across folds
  const configScores = new Map();
  for (const fr of foldResults) {
    const key = JSON.stringify(fr.best_params);
    if (!configScores.has(key)) configScores.set(key, { params: fr.best_params, oos_values: [], train_values: [], count: 0 });
    const entry = configScores.get(key);
    entry.oos_values.push(fr.oos_metric);
    entry.train_values.push(fr.train_metric);
    entry.count++;
  }

  // Pick best by average OOS metric
  let bestConfig = null;
  let bestAvgOOS = -Infinity;
  const allConfigs = [];

  for (const [key, entry] of configScores) {
    const avgOOS = entry.oos_values.reduce((s, v) => s + v, 0) / entry.oos_values.length;
    const avgTrain = entry.train_values.reduce((s, v) => s + v, 0) / entry.train_values.length;
    allConfigs.push({ params: entry.params, avg_oos: avgOOS, avg_train: avgTrain, count: entry.count });
    if (avgOOS > bestAvgOOS) {
      bestAvgOOS = avgOOS;
      bestConfig = entry.params;
    }
  }

  allConfigs.sort((a, b) => b.avg_oos - a.avg_oos);

  // Stability: std dev of OOS metrics across folds
  const oosValues = foldResults.map(f => f.oos_metric);
  const mean = oosValues.length > 0 ? oosValues.reduce((s, v) => s + v, 0) / oosValues.length : 0;
  const variance = oosValues.length > 1
    ? oosValues.reduce((s, v) => s + (v - mean) ** 2, 0) / (oosValues.length - 1)
    : 0;
  const stability = Math.sqrt(variance);

  return { folds: foldResults, best_config: bestConfig, stability, all_configs: allConfigs };
}

/**
 * Generate WFO report markdown
 */
export function wfoToMarkdown(strategyName, wfoResult) {
  const lines = [
    `## WFO: ${strategyName}`,
    `- folds: ${wfoResult.folds.length}`,
    `- best_config: ${JSON.stringify(wfoResult.best_config)}`,
    `- stability (OOS stddev): ${stableFormatNumber(wfoResult.stability, 4)}`,
    ''
  ];

  for (const f of wfoResult.folds) {
    lines.push(`### Fold ${f.fold}`);
    lines.push(`- train_bars: ${f.train_bars}, oos_bars: ${f.oos_bars}`);
    lines.push(`- best_params: ${JSON.stringify(f.best_params)}`);
    lines.push(`- train_metric: ${stableFormatNumber(f.train_metric, 4)}`);
    lines.push(`- oos_metric: ${stableFormatNumber(f.oos_metric, 4)}`);
    lines.push('');
  }

  return lines.join('\n');
}
