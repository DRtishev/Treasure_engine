#!/usr/bin/env node
// E108 Library - Anchors and fingerprinting for Edge Factory
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text } from './e66_lib.mjs';
import { readSumsCoreText } from './foundation_sums.mjs';

export const E108_ROOT = path.resolve('reports/evidence/E108');

export function anchorsE108() {
  const hashOrAbsent = (p) => fs.existsSync(path.resolve(p)) ? sha256File(path.resolve(p)) : 'ABSENT';
  const readCanon = (p) => {
    if (!fs.existsSync(path.resolve(p))) return 'ABSENT';
    const m = fs.readFileSync(path.resolve(p), 'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
    return m ? m[1] : 'ABSENT';
  };

  return {
    e107_canonical_fingerprint: readCanon('reports/evidence/E107/CLOSEOUT.md'),
    foundation_ci_hash: hashOrAbsent('scripts/verify/foundation_ci.mjs'),
    foundation_sums_hash: hashOrAbsent('scripts/verify/foundation_sums.mjs'),
    foundation_render_hash: hashOrAbsent('scripts/verify/foundation_render.mjs'),
    foundation_lock_hash: hashOrAbsent('scripts/verify/foundation_lock.mjs'),
    strategy_interface_hash: hashOrAbsent('core/edge/strategy_interface.mjs'),
    s1_breakout_hash: hashOrAbsent('core/edge/strategies/s1_breakout_atr.mjs'),
    s2_mean_revert_hash: hashOrAbsent('core/edge/strategies/s2_mean_revert_rsi.mjs'),
    backtest_engine_hash: hashOrAbsent('core/backtest/engine.mjs'),
    walk_forward_hash: hashOrAbsent('core/wfo/walk_forward.mjs'),
    overfit_court_hash: hashOrAbsent('core/wfo/overfit_court.mjs'),
    micro_live_readiness_hash: hashOrAbsent('core/gates/micro_live_readiness.mjs')
  };
}

export function evidenceFingerprintE108() {
  const coreReq = [
    'PREFLIGHT.md',
    'CONTRACTS_SUMMARY.md',
    'PERF_NOTES.md',
    'STRATEGY_CARDS.md',
    'BACKTEST_FIXTURE_RUN.md',
    'DETERMINISM_X2.md',
    'WFO_REPORT.md',
    'OVERFIT_COURT.md',
    'PAPER_LIVE_REPLAY_24H.md',
    'PAPER_LIVE_PLAN_7D.md',
    'MICRO_LIVE_READINESS.md'
  ];

  if (coreReq.some(f => !fs.existsSync(path.join(E108_ROOT, f)))) return '';

  const chunks = [`## ANCHORS\n${JSON.stringify(anchorsE108())}\n`];
  for (const f of coreReq) {
    chunks.push(`## ${f}\n${fs.readFileSync(path.join(E108_ROOT, f), 'utf8')}`);
  }

  if (fs.existsSync(path.join(E108_ROOT, 'SEAL_X2.md'))) {
    chunks.push(`## SEAL_X2.md\n${fs.readFileSync(path.join(E108_ROOT, 'SEAL_X2.md'), 'utf8')}`);
  }

  chunks.push(`## SUMS_CORE\n${readSumsCoreText(path.join(E108_ROOT, 'SHA256SUMS.md'), [
    ' reports/evidence/E108/CLOSEOUT.md',
    ' reports/evidence/E108/VERDICT.md',
    ' reports/evidence/E108/SHA256SUMS.md'
  ])}`);

  return sha256Text(chunks.join('\n'));
}
