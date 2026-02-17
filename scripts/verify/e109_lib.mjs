// E109 Library: Anchors + Evidence Fingerprint
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text } from './e66_lib.mjs';

export const E109_ROOT = path.resolve('reports/evidence/E109');

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

/**
 * Compute E109 anchors (all critical inputs that this epoch depends on)
 */
export function anchorsE109() {
  return {
    e108_canonical_fingerprint: readCanon('reports/evidence/E108/CLOSEOUT.md'),
    foundation_ci_hash: hashOrAbsent('scripts/verify/foundation_ci.mjs'),
    foundation_sums_hash: hashOrAbsent('scripts/verify/foundation_sums.mjs'),
    foundation_render_hash: hashOrAbsent('scripts/verify/foundation_render.mjs'),
    foundation_lock_hash: hashOrAbsent('scripts/verify/foundation_lock.mjs'),
    foundation_git_hash: hashOrAbsent('scripts/verify/foundation_git.mjs'),
    foundation_paths_hash: hashOrAbsent('scripts/verify/foundation_paths.mjs'),
    exchange_interface_hash: hashOrAbsent('core/live/exchange_interface.mjs'),
    fixture_exchange_hash: hashOrAbsent('core/live/exchanges/fixture_exchange.mjs'),
    bybit_adapter_hash: hashOrAbsent('core/live/exchanges/bybit_rest_testnet.mjs'),
    strategy_interface_hash: hashOrAbsent('core/edge/strategy_interface.mjs'),
    backtest_engine_hash: hashOrAbsent('core/backtest/engine.mjs'),
    walk_forward_hash: hashOrAbsent('core/wfo/walk_forward.mjs'),
    overfit_court_hash: hashOrAbsent('core/wfo/overfit_court.mjs'),
    micro_live_readiness_hash: hashOrAbsent('core/gates/micro_live_readiness.mjs'),
    capsule_build_hash: hashOrAbsent('scripts/data/e109_capsule_build.mjs'),
    harvest_hash: hashOrAbsent('scripts/edge/e109_harvest_candidates.mjs'),
    pilot_fixture_hash: hashOrAbsent('scripts/live/e109_micro_live_pilot_fixture.mjs')
  };
}

/**
 * Compute canonical evidence fingerprint for E109.
 * Excludes CLOSEOUT.md, VERDICT.md, SHA256SUMS.md (derived files).
 */
export function evidenceFingerprintE109() {
  const coreFiles = [
    'PREFLIGHT.md',
    'CONTRACTS_SUMMARY.md',
    'PERF_NOTES.md',
    'DATA_CAPSULES.md',
    'STRATEGY_SCOREBOARD.md',
    'MICRO_LIVE_PILOT.md',
    'DAILY_REPORT.md'
  ];

  const parts = [];
  for (const f of coreFiles) {
    const fp = path.join(E109_ROOT, f);
    if (fs.existsSync(fp)) {
      parts.push(`${f}:${sha256File(fp)}`);
    }
  }

  // Include SEAL_X2 if present
  const sealPath = path.join(E109_ROOT, 'SEAL_X2.md');
  if (fs.existsSync(sealPath)) {
    parts.push(`SEAL_X2.md:${sha256File(sealPath)}`);
  }

  return sha256Text(parts.join('\n'));
}
