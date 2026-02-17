#!/usr/bin/env node
// E103 Library - Close The Skips
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text } from './e66_lib.mjs';
import { isCIMode } from './foundation_ci.mjs';
import { repoRootPlaceholder } from './foundation_paths.mjs';
import { readSumsCoreText } from './foundation_sums.mjs';

export const E103_ROOT = path.resolve('reports/evidence/E103');
export const E103_LOCK_PATH = path.resolve('.foundation-seal/E103_KILL_LOCK.md');

export function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
export function isQuiet() { return String(process.env.QUIET || '0') === '1'; }
export function minimalLog(msg) { if (!isQuiet()) console.log(msg); }

/**
 * Read canonical fingerprint from CLOSEOUT or VERDICT
 */
export function readCanonicalFingerprintFromMd(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const m = fs.readFileSync(filePath, 'utf8').match(/^- canonical_fingerprint:\s*([a-f0-9]{64})/m);
  return m ? m[1] : '';
}

/**
 * Compute E103 anchors (dependencies + foundation modules)
 */
export function anchorsE103() {
  const hashOrAbsent = (p) => fs.existsSync(path.resolve(p)) ? sha256File(path.resolve(p)) : 'ABSENT';
  const readCanon = (p) => {
    if (!fs.existsSync(path.resolve(p))) return 'ABSENT';
    const m = fs.readFileSync(path.resolve(p), 'utf8').match(/^- canonical_fingerprint:\s*([a-f0-9]{64})/m);
    return m ? m[1] : 'ABSENT';
  };

  return {
    e101_canonical_fingerprint: readCanon('reports/evidence/E101/CLOSEOUT.md'),
    e102_canonical_fingerprint: readCanon('reports/evidence/E102/CLOSEOUT.md'),
    foundation_ci_hash: hashOrAbsent('scripts/verify/foundation_ci.mjs'),
    foundation_paths_hash: hashOrAbsent('scripts/verify/foundation_paths.mjs'),
    foundation_git_hash: hashOrAbsent('scripts/verify/foundation_git.mjs'),
    foundation_sums_hash: hashOrAbsent('scripts/verify/foundation_sums.mjs'),
    foundation_lock_hash: hashOrAbsent('scripts/verify/foundation_lock.mjs'),
    foundation_render_hash: hashOrAbsent('scripts/verify/foundation_render.mjs'),
    e101_apply_txn_hash: hashOrAbsent('scripts/verify/e101_apply_txn.mjs'),
    e101_rollback_txn_hash: hashOrAbsent('scripts/verify/e101_rollback_txn.mjs')
  };
}

/**
 * Evidence fingerprint for E103
 * Excludes CLOSEOUT/VERDICT/BUNDLE_HASH* to avoid circular dependency
 */
export function evidenceFingerprintE103() {
  const coreReq = [
    'PREFLIGHT.md',
    'GOAL_1_FAST_APPLY.md',
    'GOAL_2_CORRUPTION_DRILL.md',
    'GOAL_3_SEAL_X2.md',
    'GOAL_4_NO_GIT_BOOTSTRAP.md'
  ];

  // Check all core files exist
  if (coreReq.some(f => !fs.existsSync(path.join(E103_ROOT, f)))) return '';

  const chunks = [`## ANCHORS\n${JSON.stringify(anchorsE103())}\n`];
  for (const f of coreReq) {
    const p = path.join(E103_ROOT, f);
    if (fs.existsSync(p)) {
      chunks.push(`## ${f}\n${fs.readFileSync(p, 'utf8')}`);
    }
  }

  chunks.push(`## SUMS_CORE\n${readSumsCoreText(path.join(E103_ROOT, 'SHA256SUMS.md'), [
    ' reports/evidence/E103/CLOSEOUT.md',
    ' reports/evidence/E103/VERDICT.md',
    ' reports/evidence/E103/SHA256SUMS.md',
    ' reports/evidence/E103/BUNDLE_HASH.md',
    ' reports/evidence/E103/BUNDLE_HASH_V2.md'
  ])}`);

  return sha256Text(chunks.join('\n'));
}
