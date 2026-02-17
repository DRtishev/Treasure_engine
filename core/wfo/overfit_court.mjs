#!/usr/bin/env node
// E108 Track 3: Overfit Court
// Rules to FAIL suspicious edges:
// - IS much better than OOS beyond threshold
// - too-many-params penalty
// - unstable across folds

import { stableFormatNumber } from '../../scripts/verify/foundation_render.mjs';

/**
 * Run overfit court on WFO results
 * @param {Object} wfoResult - From runWalkForward()
 * @param {Object} opts - { max_is_oos_ratio, max_params, max_stability_stddev, min_folds }
 * @returns {{ verdict: 'PASS'|'FAIL', reasons: Array, metrics: Object }}
 */
export function runOverfitCourt(wfoResult, opts = {}) {
  const maxIStoOOSRatio = opts.max_is_oos_ratio || 3.0;
  const maxParams = opts.max_params || 5;
  const maxStabilityStddev = opts.max_stability_stddev || 2.0;
  const minFolds = opts.min_folds || 2;

  const reasons = [];
  const checks = [];

  // Check 1: Minimum folds
  const foldCount = wfoResult.folds.length;
  const foldPass = foldCount >= minFolds;
  checks.push({ name: 'min_folds', pass: foldPass, detail: `folds=${foldCount} threshold=${minFolds}` });
  if (!foldPass) reasons.push(`Insufficient folds: ${foldCount} < ${minFolds}`);

  // Check 2: IS vs OOS ratio
  let avgIS = 0, avgOOS = 0;
  for (const f of wfoResult.folds) {
    avgIS += f.train_metric;
    avgOOS += f.oos_metric;
  }
  if (foldCount > 0) {
    avgIS /= foldCount;
    avgOOS /= foldCount;
  }

  const isOosRatio = avgOOS !== 0 ? Math.abs(avgIS / avgOOS) : (avgIS > 0 ? Infinity : 1);
  const ratioPass = isOosRatio <= maxIStoOOSRatio;
  checks.push({ name: 'is_oos_ratio', pass: ratioPass, detail: `ratio=${stableFormatNumber(isOosRatio, 2)} threshold=${maxIStoOOSRatio}` });
  if (!ratioPass) reasons.push(`IS/OOS ratio too high: ${stableFormatNumber(isOosRatio, 2)} > ${maxIStoOOSRatio}`);

  // Check 3: Parameter count
  const paramCount = wfoResult.best_config ? Object.keys(wfoResult.best_config).length : 0;
  const paramPass = paramCount <= maxParams;
  checks.push({ name: 'param_count', pass: paramPass, detail: `params=${paramCount} threshold=${maxParams}` });
  if (!paramPass) reasons.push(`Too many params: ${paramCount} > ${maxParams}`);

  // Check 4: Stability across folds
  const stabilityPass = wfoResult.stability <= maxStabilityStddev;
  checks.push({ name: 'fold_stability', pass: stabilityPass, detail: `stddev=${stableFormatNumber(wfoResult.stability, 4)} threshold=${maxStabilityStddev}` });
  if (!stabilityPass) reasons.push(`Unstable across folds: stddev=${stableFormatNumber(wfoResult.stability, 4)} > ${maxStabilityStddev}`);

  // Check 5: OOS must be positive
  const oosPositive = avgOOS > 0;
  checks.push({ name: 'oos_positive', pass: oosPositive, detail: `avg_oos=${stableFormatNumber(avgOOS, 4)}` });
  if (!oosPositive) reasons.push(`Negative OOS performance: avg=${stableFormatNumber(avgOOS, 4)}`);

  const verdict = reasons.length === 0 ? 'PASS' : 'FAIL';

  return {
    verdict,
    reasons,
    checks,
    metrics: {
      avg_is: avgIS,
      avg_oos: avgOOS,
      is_oos_ratio: isOosRatio,
      param_count: paramCount,
      stability: wfoResult.stability,
      fold_count: foldCount
    }
  };
}

/**
 * Generate Overfit Court report markdown
 */
export function overfitCourtToMarkdown(strategyName, courtResult) {
  const lines = [
    `## Overfit Court: ${strategyName}`,
    `- verdict: ${courtResult.verdict}`,
    ''
  ];

  lines.push('### Checks');
  for (const c of courtResult.checks) {
    lines.push(`- ${c.name}: ${c.pass ? 'PASS' : 'FAIL'} (${c.detail})`);
  }
  lines.push('');

  if (courtResult.reasons.length > 0) {
    lines.push('### Failure Reasons');
    for (const r of courtResult.reasons) {
      lines.push(`- ${r}`);
    }
    lines.push('');
  }

  lines.push('### Metrics');
  lines.push(`- avg_is: ${stableFormatNumber(courtResult.metrics.avg_is, 4)}`);
  lines.push(`- avg_oos: ${stableFormatNumber(courtResult.metrics.avg_oos, 4)}`);
  lines.push(`- is_oos_ratio: ${stableFormatNumber(courtResult.metrics.is_oos_ratio, 2)}`);
  lines.push(`- param_count: ${courtResult.metrics.param_count}`);
  lines.push(`- stability: ${stableFormatNumber(courtResult.metrics.stability, 4)}`);
  lines.push(`- fold_count: ${courtResult.metrics.fold_count}`);
  lines.push('');

  return lines.join('\n');
}
