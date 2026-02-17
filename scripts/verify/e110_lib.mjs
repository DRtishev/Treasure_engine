// E110 Library: Anchors + Evidence Fingerprint
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text } from './e66_lib.mjs';

export const E110_ROOT = path.resolve('reports/evidence/E110');

function hashOrAbsent(p) {
  const full = path.resolve(p);
  return fs.existsSync(full) ? sha256File(full) : 'ABSENT';
}

function readCanon(p) {
  const full = path.resolve(p);
  if (!fs.existsSync(full)) return 'ABSENT';
  const text = fs.readFileSync(full, 'utf8');
  const m = text.match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
  return m ? m[1] : 'NOT_FOUND';
}

export function anchorsE110() {
  return {
    e109_canonical_fingerprint: readCanon('reports/evidence/E109/CLOSEOUT.md'),
    foundation_ci_hash: hashOrAbsent('scripts/verify/foundation_ci.mjs'),
    foundation_sums_hash: hashOrAbsent('scripts/verify/foundation_sums.mjs'),
    foundation_render_hash: hashOrAbsent('scripts/verify/foundation_render.mjs'),
    foundation_lock_hash: hashOrAbsent('scripts/verify/foundation_lock.mjs'),
    exchange_interface_hash: hashOrAbsent('core/live/exchange_interface.mjs'),
    fixture_exchange_hash: hashOrAbsent('core/live/exchanges/fixture_exchange.mjs'),
    backtest_engine_hash: hashOrAbsent('core/backtest/engine.mjs'),
    walk_forward_hash: hashOrAbsent('core/wfo/walk_forward.mjs'),
    overfit_court_hash: hashOrAbsent('core/wfo/overfit_court.mjs'),
    capsule_builder_hash: hashOrAbsent('scripts/data/e110_capsule_builder.mjs'),
    cost_model_hash: hashOrAbsent('scripts/verify/e110_cost_model.mjs'),
    harvest_v2_hash: hashOrAbsent('scripts/edge/e110_harvest_v2.mjs')
  };
}

/**
 * Canonical fingerprint: excludes CLOSEOUT, VERDICT, SHA256SUMS (derived).
 */
export function evidenceFingerprintE110() {
  const coreFiles = [
    'PREFLIGHT.md',
    'CONTRACTS_SUMMARY.md',
    'PERF_NOTES.md',
    'DATA_QUORUM_V2.md',
    'EXEC_COST_MODEL.md',
    'GAP_REPORT.md',
    'CANDIDATE_BOARD.md',
    'MICRO_LIVE_PLAN.md',
    'DAILY_REPORT_SAMPLE.md',
    'PERF_BUDGET.md'
  ];

  const parts = [];
  for (const f of coreFiles) {
    const fp = path.join(E110_ROOT, f);
    if (fs.existsSync(fp)) {
      parts.push(`${f}:${sha256File(fp)}`);
    }
  }

  const sealPath = path.join(E110_ROOT, 'SEAL_X2.md');
  if (fs.existsSync(sealPath)) {
    parts.push(`SEAL_X2.md:${sha256File(sealPath)}`);
  }

  return sha256Text(parts.join('\n'));
}
