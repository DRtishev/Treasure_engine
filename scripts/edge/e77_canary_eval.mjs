#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { runE76ProfitEnvelope } from '../../core/edge/e76_profit_reality_bridge.mjs';
import { parseReconMulti, summarizeReconMulti } from '../../core/edge/e77_recon_multi.mjs';

function parseContract(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const scalar = (k, d) => Number((raw.match(new RegExp(`- ${k}:\\s*([0-9.-]+)`)) || [])[1] ?? d);
  const budget = {};
  for (const m of raw.matchAll(/- (NOT_ROBUST|LOT_CONSTRAINT_FAIL|MIN_NOTIONAL_FAIL|LOOKAHEAD_SUSPECT|INVALID_SAMPLE|CALIBRATION_DRIFT):\s*([0-9]+)/g)) budget[m[1]] = Number(m[2]);
  return {
    MIN_ROBUSTNESS_SCORE: scalar('MIN_ROBUSTNESS_SCORE', -0.05),
    MAX_WORSTCASE_DRAWDOWN: scalar('MAX_WORSTCASE_DRAWDOWN', 25),
    MIN_NET_EXPECTANCY_WORST: scalar('MIN_NET_EXPECTANCY_WORST', -0.02),
    MAX_LOOKAHEAD_SUSPECT_RATE: scalar('MAX_LOOKAHEAD_SUSPECT_RATE', 0.1),
    budgets: budget
  };
}

export function runE77CanaryEval(opts = {}) {
  const seed = Number(opts.seed ?? process.env.SEED ?? 12345);
  const reconFile = path.resolve(opts.reconFile || 'core/edge/fixtures/e77_recon_observed_multi.csv');
  const contractFile = path.resolve(opts.contractFile || 'core/edge/contracts/e77_canary_contract.md');
  const calibrationFile = path.resolve(opts.calibrationFile || 'core/edge/calibration/execution_envelope_calibration.md');

  const e76 = runE76ProfitEnvelope({ seed });
  const reconRows = parseReconMulti(reconFile);
  const recon = summarizeReconMulti(reconRows, reconFile);
  const contract = parseContract(contractFile);
  const calibrationHash = crypto.createHash('sha256').update(fs.readFileSync(calibrationFile)).digest('hex');

  const rows = [];
  const counts = { PASS: 0, NOT_ROBUST: 0, LOT_CONSTRAINT_FAIL: 0, MIN_NOTIONAL_FAIL: 0, LOOKAHEAD_SUSPECT: 0, INVALID_SAMPLE: 0, CALIBRATION_DRIFT: 0 };
  for (const c of e76.candidates) {
    let reason = c.reason_code;
    if (reason === 'OK') {
      if (c.robust_score < contract.MIN_ROBUSTNESS_SCORE) reason = 'NOT_ROBUST';
      else if (c.metrics.WORST.max_drawdown > contract.MAX_WORSTCASE_DRAWDOWN) reason = 'NOT_ROBUST';
      else if (c.metrics.WORST.expectancy < contract.MIN_NET_EXPECTANCY_WORST) reason = 'NOT_ROBUST';
    }
    if (!counts[reason]) counts[reason] = 0;
    counts[reason] += 1;
    rows.push({ candidate_id: c.candidate_id, robust_score: c.robust_score, worst_expectancy: c.metrics.WORST.expectancy, worst_drawdown: c.metrics.WORST.max_drawdown, reason_code: reason, verdict: reason === 'OK' ? 'PASS' : 'FAIL' });
  }

  const lookaheadRate = rows.length ? (counts.LOOKAHEAD_SUSPECT || 0) / rows.length : 0;
  if (lookaheadRate > contract.MAX_LOOKAHEAD_SUSPECT_RATE) {
    counts.CALIBRATION_DRIFT += 1;
    rows.push({ candidate_id: '__GLOBAL__', robust_score: 0, worst_expectancy: 0, worst_drawdown: 0, reason_code: 'CALIBRATION_DRIFT', verdict: 'FAIL' });
  }

  for (const [rc, lim] of Object.entries(contract.budgets)) {
    if ((counts[rc] || 0) > lim) {
      rows.push({ candidate_id: `__BUDGET__${rc}`, robust_score: 0, worst_expectancy: 0, worst_drawdown: 0, reason_code: 'CALIBRATION_DRIFT', verdict: 'FAIL' });
      counts.CALIBRATION_DRIFT += 1;
    }
  }

  rows.sort((a, b) => a.candidate_id.localeCompare(b.candidate_id));
  const run_fingerprint = crypto.createHash('sha256').update(JSON.stringify({ seed, recon_fingerprint: recon.fingerprint, calibrationHash, rows })).digest('hex');
  return { seed, recon_fingerprint: recon.fingerprint, calibration_hash: calibrationHash, rows, counts, run_fingerprint };
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(runE77CanaryEval(), null, 2));
