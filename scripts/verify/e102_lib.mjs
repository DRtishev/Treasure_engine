#!/usr/bin/env node
// E102 Library - Quintuple Stack Core
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text } from './e66_lib.mjs';
import { isCIMode } from './foundation_ci.mjs';
import { repoRootPlaceholder } from './foundation_paths.mjs';
import { readSumsCoreText } from './foundation_sums.mjs';

export const E102_ROOT = path.resolve('reports/evidence/E102');
export const E102_LOCK_PATH = path.resolve('.foundation-seal/E102_KILL_LOCK.md');
export const E102_JOURNAL_PATH = path.resolve('.foundation-seal/E102_APPLY_JOURNAL.json');

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
 * Compute E102 anchors (dependencies + state hashes + foundation modules)
 */
export function anchorsE102() {
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
    e101_canonical_fingerprint: readCanon('reports/evidence/E101/CLOSEOUT.md'),
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
 * Evidence fingerprint for E102 (adaptive: core vs full)
 * Excludes BUNDLE_HASH* to avoid circular dependency
 */
export function evidenceFingerprintE102() {
  // Core files always required
  const coreReq = [
    'PREFLIGHT.md',
    'CONTRACTS_SUMMARY.md',
    'PERF_NOTES.md',
    'OPERATOR_PLAYBOOK.md'
  ];

  // Transaction files (optional after apply/rollback)
  const txnReq = [
    'APPLY_TXN.md',
    'RUNS_APPLY_TXN_X2.md',
    'ROLLBACK_TXN.md',
    'RUNS_ROLLBACK_X2.md'
  ];

  // Track A items (optional)
  const trackAReq = [
    'APPLY_TXN_FAST.md',
    'CORRUPTION_DRILL.md',
    'RUNS_SEAL_X2.md',
    'BOOTSTRAP_NO_GIT.md'
  ];

  // Track D items (optional)
  const trackDReq = [
    'PROFIT_DASHBOARD.md',
    'PROFIT_ANOMALY.md'
  ];

  // Check core files exist
  if (coreReq.some(f => !fs.existsSync(path.join(E102_ROOT, f)))) return '';

  // Build file list adaptively
  let req = [...coreReq];

  // Add transaction files if present
  const applyTxnExists = fs.existsSync(path.join(E102_ROOT, 'APPLY_TXN.md'));
  if (applyTxnExists) {
    req.push(...txnReq.filter(f => fs.existsSync(path.join(E102_ROOT, f))));
  }

  // Add Track A files if present
  req.push(...trackAReq.filter(f => fs.existsSync(path.join(E102_ROOT, f))));

  // Add Track D files if present
  req.push(...trackDReq.filter(f => fs.existsSync(path.join(E102_ROOT, f))));

  const chunks = [`## ANCHORS\n${JSON.stringify(anchorsE102())}\n`];
  for (const f of req) {
    const p = path.join(E102_ROOT, f);
    if (fs.existsSync(p)) {
      chunks.push(`## ${f}\n${fs.readFileSync(p, 'utf8')}`);
    }
  }

  chunks.push(`## SUMS_CORE\n${readSumsCoreText(path.join(E102_ROOT, 'SHA256SUMS.md'), [
    ' reports/evidence/E102/CLOSEOUT.md',
    ' reports/evidence/E102/VERDICT.md',
    ' reports/evidence/E102/SHA256SUMS.md',
    ' reports/evidence/E102/BUNDLE_HASH.md',
    ' reports/evidence/E102/BUNDLE_HASH_V2.md'
  ])}`);

  return sha256Text(chunks.join('\n'));
}
