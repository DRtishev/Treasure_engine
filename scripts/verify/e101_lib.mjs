#!/usr/bin/env node
// E101 Library - Triple Stack Core
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text } from './e66_lib.mjs';
import { isCIMode } from './foundation_ci.mjs';
import { repoRootPlaceholder } from './foundation_paths.mjs';
import { readSumsCoreText } from './foundation_sums.mjs';

export const E101_ROOT = path.resolve('reports/evidence/E101');
export const E101_LOCK_PATH = path.resolve('.foundation-seal/E101_KILL_LOCK.md');
export const E101_JOURNAL_PATH = path.resolve('.foundation-seal/E101_APPLY_JOURNAL.json');

export function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
export function isQuiet() { return String(process.env.QUIET || '0') === '1'; }
export function minimalLog(msg) { console.log(msg); }

/**
 * Read canonical fingerprint from CLOSEOUT or VERDICT
 */
export function readCanonicalFingerprintFromMd(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const m = fs.readFileSync(filePath, 'utf8').match(/^- canonical_fingerprint:\s*([a-f0-9]{64})/m);
  return m ? m[1] : '';
}

/**
 * Compute E101 anchors (dependencies + state hashes)
 * E101-1: Track E97..E100 + foundation modules
 */
export function anchorsE101() {
  const hashOrAbsent = (p) => fs.existsSync(path.resolve(p)) ? sha256File(path.resolve(p)) : 'ABSENT';
  const readCanon = (p) => {
    if (!fs.existsSync(path.resolve(p))) return 'ABSENT';
    const m = fs.readFileSync(path.resolve(p), 'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
    return m ? m[1] : 'ABSENT';
  };

  return {
    e97_canonical_fingerprint: readCanon('reports/evidence/E97/CLOSEOUT.md'),
    e98_canonical_fingerprint: readCanon('reports/evidence/E98/CLOSEOUT.md'),
    e99_canonical_fingerprint: readCanon('reports/evidence/E99/CLOSEOUT.md'),
    e100_canonical_fingerprint: readCanon('reports/evidence/E100/CLOSEOUT.md'),
    e97_overlay_hash: hashOrAbsent('core/edge/contracts/e97_envelope_tuning_overlay.md'),
    e97_profit_ledger_hash: hashOrAbsent('core/edge/state/profit_ledger_state.md'),
    foundation_ci_hash: hashOrAbsent('scripts/verify/foundation_ci.mjs'),
    foundation_paths_hash: hashOrAbsent('scripts/verify/foundation_paths.mjs'),
    foundation_git_hash: hashOrAbsent('scripts/verify/foundation_git.mjs'),
    foundation_sums_hash: hashOrAbsent('scripts/verify/foundation_sums.mjs'),
    foundation_lock_hash: hashOrAbsent('scripts/verify/foundation_lock.mjs'),
    foundation_render_hash: hashOrAbsent('scripts/verify/foundation_render.mjs')
  };
}

/**
 * Evidence fingerprint for E101 (adaptive: core vs full)
 * E101: Excludes BUNDLE_HASH.md to avoid circular dependency
 */
export function evidenceFingerprintE101() {
  // Core files always required
  const coreReq = [
    'PREFLIGHT.md',
    'CONTRACTS_SUMMARY.md',
    'PERF_NOTES.md'
  ];

  // Transaction files only after apply/rollback
  const txnReq = [
    'APPLY_TXN.md',
    'RUNS_APPLY_TXN_X2.md',
    'ROLLBACK_TXN.md',
    'RUNS_ROLLBACK_X2.md',
    'APPLY_TXN_FAST.md',
    'CORRUPTION_DRILL.md'
  ];

  // Bootstrap/seal files
  const metaReq = [
    'BOOTSTRAP_NO_GIT.md',
    'RUNS_SEAL_X2.md'
  ];

  // Check core files exist
  if (coreReq.some(f => !fs.existsSync(path.join(E101_ROOT, f)))) return '';

  // Determine which files to include
  const applyTxnExists = fs.existsSync(path.join(E101_ROOT, 'APPLY_TXN.md'));
  const bootstrapExists = fs.existsSync(path.join(E101_ROOT, 'BOOTSTRAP_NO_GIT.md'));
  const sealX2Exists = fs.existsSync(path.join(E101_ROOT, 'RUNS_SEAL_X2.md'));

  let req = [...coreReq];
  if (applyTxnExists) req.push(...txnReq.filter(f => fs.existsSync(path.join(E101_ROOT, f))));
  if (bootstrapExists) req.push('BOOTSTRAP_NO_GIT.md');
  if (sealX2Exists) req.push('RUNS_SEAL_X2.md');

  const chunks = [`## ANCHORS\n${JSON.stringify(anchorsE101())}\n`];
  for (const f of req) {
    const p = path.join(E101_ROOT, f);
    if (fs.existsSync(p)) {
      chunks.push(`## ${f}\n${fs.readFileSync(p, 'utf8')}`);
    }
  }
  chunks.push(`## SUMS_CORE\n${readSumsCoreText(path.join(E101_ROOT, 'SHA256SUMS.md'), [
    ' reports/evidence/E101/CLOSEOUT.md',
    ' reports/evidence/E101/VERDICT.md',
    ' reports/evidence/E101/SHA256SUMS.md',
    ' reports/evidence/E101/BUNDLE_HASH.md'
  ])}`);

  return sha256Text(chunks.join('\n'));
}
