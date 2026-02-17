#!/usr/bin/env node
// E107 Library - Anchors and fingerprinting for First Profit Loop
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text } from './e66_lib.mjs';
import { readSumsCoreText } from './foundation_sums.mjs';

export const E107_ROOT = path.resolve('reports/evidence/E107');

/**
 * E107 Anchors - dependencies from prior epochs + foundation modules
 */
export function anchorsE107() {
  const hashOrAbsent = (p) => fs.existsSync(path.resolve(p)) ? sha256File(path.resolve(p)) : 'ABSENT';
  const readCanon = (p) => {
    if (!fs.existsSync(path.resolve(p))) return 'ABSENT';
    const m = fs.readFileSync(path.resolve(p), 'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
    return m ? m[1] : 'ABSENT';
  };

  return {
    // Prior epoch fingerprint
    e106_canonical_fingerprint: readCanon('reports/evidence/E106/CLOSEOUT.md'),

    // Foundation module hashes
    foundation_ci_hash: hashOrAbsent('scripts/verify/foundation_ci.mjs'),
    foundation_paths_hash: hashOrAbsent('scripts/verify/foundation_paths.mjs'),
    foundation_sums_hash: hashOrAbsent('scripts/verify/foundation_sums.mjs'),
    foundation_lock_hash: hashOrAbsent('scripts/verify/foundation_lock.mjs'),
    foundation_render_hash: hashOrAbsent('scripts/verify/foundation_render.mjs'),
    foundation_git_hash: hashOrAbsent('scripts/verify/foundation_git.mjs'),

    // E107 core module hashes
    ledger_hash: hashOrAbsent('core/profit/ledger.mjs'),
    feed_hash: hashOrAbsent('core/live/feed.mjs'),
    paper_live_runner_hash: hashOrAbsent('core/paper/paper_live_runner.mjs'),
    daily_report_hash: hashOrAbsent('scripts/report/e107_daily_report.mjs'),
    fetch_ohlcv_hash: hashOrAbsent('scripts/data/e107_fetch_ohlcv.mjs'),
    normalize_hash: hashOrAbsent('scripts/data/e107_normalize_to_chunks.mjs')
  };
}

/**
 * E107 Evidence Fingerprint (excludes CLOSEOUT/VERDICT/SHA256SUMS)
 */
export function evidenceFingerprintE107() {
  const coreReq = [
    'PREFLIGHT.md',
    'CONTRACTS_SUMMARY.md',
    'PERF_NOTES.md',
    'DATA_PIPELINE.md',
    'PROFIT_LEDGER_SPEC.md',
    'DAILY_REPORT_SAMPLE.md',
    'PAPER_LIVE_RUN.md',
    'RISK_GUARDRAILS.md'
  ];

  // Check if all required files exist
  if (coreReq.some(f => !fs.existsSync(path.join(E107_ROOT, f)))) {
    return '';
  }

  const chunks = [`## ANCHORS\n${JSON.stringify(anchorsE107())}\n`];
  for (const f of coreReq) {
    chunks.push(`## ${f}\n${fs.readFileSync(path.join(E107_ROOT, f), 'utf8')}`);
  }

  // Add SEAL_X2 if exists
  if (fs.existsSync(path.join(E107_ROOT, 'SEAL_X2.md'))) {
    chunks.push(`## SEAL_X2.md\n${fs.readFileSync(path.join(E107_ROOT, 'SEAL_X2.md'), 'utf8')}`);
  }

  chunks.push(`## SUMS_CORE\n${readSumsCoreText(path.join(E107_ROOT, 'SHA256SUMS.md'), [
    ' reports/evidence/E107/CLOSEOUT.md',
    ' reports/evidence/E107/VERDICT.md',
    ' reports/evidence/E107/SHA256SUMS.md'
  ])}`);

  return sha256Text(chunks.join('\n'));
}
