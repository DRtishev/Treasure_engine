#!/usr/bin/env node
// E108 Track 5: Micro-Live Readiness Gate
// Determines if a strategy can graduate from paper to micro-live
// Inputs: daily reports + ledger summaries
// Outputs: READY / NOT_READY with reasons

import { stableFormatNumber } from '../../scripts/verify/foundation_render.mjs';

const DEFAULT_THRESHOLDS = {
  min_sample_days: 3,
  max_drawdown_pct: 5.0,
  max_anomalies: 2,
  min_return_pct: -1.0,     // must not lose more than 1%
  min_fills: 5,
  require_oos_pass: true,
  micro_live_max_position_usd: 100,
  micro_live_max_daily_loss_usd: 20
};

/**
 * Evaluate readiness for micro-live
 * @param {Object} opts
 * @param {Array} opts.daily_summaries - Array of getLedgerSummary() results
 * @param {Object} opts.oos_court_verdict - { verdict: 'PASS'|'FAIL' }
 * @param {Object} opts.strategy_meta - { name, version, ... }
 * @param {Object} opts.thresholds - Override defaults
 * @returns {{ verdict: 'READY'|'NOT_READY', reasons: Array, recommendation: Object }}
 */
export function evaluateMicroLiveReadiness(opts) {
  const thresholds = { ...DEFAULT_THRESHOLDS, ...(opts.thresholds || {}) };
  const summaries = opts.daily_summaries || [];
  const courtVerdict = opts.oos_court_verdict || { verdict: 'UNKNOWN' };
  const meta = opts.strategy_meta || { name: 'UNKNOWN' };

  const reasons = [];
  const checks = [];

  // Check 1: Minimum sample days
  const dayCount = summaries.length;
  const dayPass = dayCount >= thresholds.min_sample_days;
  checks.push({ name: 'min_sample_days', pass: dayPass, detail: `days=${dayCount} threshold=${thresholds.min_sample_days}` });
  if (!dayPass) reasons.push(`Insufficient sample: ${dayCount} < ${thresholds.min_sample_days} days`);

  // Check 2: Max drawdown
  const maxDD = summaries.reduce((max, s) => Math.max(max, s.max_drawdown * 100), 0);
  const ddPass = maxDD <= thresholds.max_drawdown_pct;
  checks.push({ name: 'max_drawdown', pass: ddPass, detail: `max_dd=${stableFormatNumber(maxDD, 2)}% threshold=${thresholds.max_drawdown_pct}%` });
  if (!ddPass) reasons.push(`Drawdown too high: ${stableFormatNumber(maxDD, 2)}% > ${thresholds.max_drawdown_pct}%`);

  // Check 3: Anomalies
  const totalAnomalies = summaries.reduce((sum, s) => sum + (s.anomalies || 0), 0);
  const anomalyPass = totalAnomalies <= thresholds.max_anomalies;
  checks.push({ name: 'anomalies', pass: anomalyPass, detail: `anomalies=${totalAnomalies} threshold=${thresholds.max_anomalies}` });
  if (!anomalyPass) reasons.push(`Too many anomalies: ${totalAnomalies} > ${thresholds.max_anomalies}`);

  // Check 4: Minimum return
  const lastSummary = summaries.length > 0 ? summaries[summaries.length - 1] : null;
  const returnPct = lastSummary ? lastSummary.return_pct : 0;
  const returnPass = returnPct >= thresholds.min_return_pct;
  checks.push({ name: 'min_return', pass: returnPass, detail: `return=${stableFormatNumber(returnPct, 4)}% threshold=${thresholds.min_return_pct}%` });
  if (!returnPass) reasons.push(`Return too low: ${stableFormatNumber(returnPct, 4)}% < ${thresholds.min_return_pct}%`);

  // Check 5: Minimum fills (activity)
  const totalFills = summaries.reduce((sum, s) => sum + (s.total_fills || 0), 0);
  const fillPass = totalFills >= thresholds.min_fills;
  checks.push({ name: 'min_fills', pass: fillPass, detail: `fills=${totalFills} threshold=${thresholds.min_fills}` });
  if (!fillPass) reasons.push(`Insufficient fills: ${totalFills} < ${thresholds.min_fills}`);

  // Check 6: OOS court verdict
  const oosPass = !thresholds.require_oos_pass || courtVerdict.verdict === 'PASS';
  checks.push({ name: 'oos_court', pass: oosPass, detail: `court_verdict=${courtVerdict.verdict}` });
  if (!oosPass) reasons.push(`OOS Court FAIL: ${courtVerdict.verdict}`);

  const verdict = reasons.length === 0 ? 'READY' : 'NOT_READY';

  const recommendation = {
    strategy: meta.name,
    verdict,
    micro_live_config: verdict === 'READY' ? {
      max_position_usd: thresholds.micro_live_max_position_usd,
      max_daily_loss_usd: thresholds.micro_live_max_daily_loss_usd,
      recommended_duration_days: 7,
      risk_mode: 'ULTRA_CONSERVATIVE'
    } : null
  };

  return { verdict, reasons, checks, recommendation };
}

/**
 * Generate readiness report markdown
 */
export function readinessToMarkdown(result) {
  const lines = [
    `## Micro-Live Readiness`,
    `- verdict: ${result.verdict}`,
    ''
  ];

  lines.push('### Checks');
  for (const c of result.checks) {
    lines.push(`- ${c.name}: ${c.pass ? 'PASS' : 'FAIL'} (${c.detail})`);
  }
  lines.push('');

  if (result.reasons.length > 0) {
    lines.push('### Failure Reasons');
    for (const r of result.reasons) {
      lines.push(`- ${r}`);
    }
    lines.push('');
  }

  if (result.recommendation.micro_live_config) {
    const c = result.recommendation.micro_live_config;
    lines.push('### Recommended Micro-Live Config');
    lines.push(`- strategy: ${result.recommendation.strategy}`);
    lines.push(`- max_position_usd: ${c.max_position_usd}`);
    lines.push(`- max_daily_loss_usd: ${c.max_daily_loss_usd}`);
    lines.push(`- recommended_duration_days: ${c.recommended_duration_days}`);
    lines.push(`- risk_mode: ${c.risk_mode}`);
    lines.push('');
  }

  return lines.join('\n');
}
