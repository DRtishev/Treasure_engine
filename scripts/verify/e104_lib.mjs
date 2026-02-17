#!/usr/bin/env node
// E104 Library - Foundation Adoption + Hardening Quintuple
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text } from './e66_lib.mjs';
import { isCIMode } from './foundation_ci.mjs';
import { repoRootPlaceholder } from './foundation_paths.mjs';
import { readSumsCoreText } from './foundation_sums.mjs';

export const E104_ROOT = path.resolve('reports/evidence/E104');
export const E104_LOCK_PATH = path.resolve('.foundation-seal/E104_KILL_LOCK.md');

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
 * Compute E104 anchors (dependencies + foundation modules)
 */
export function anchorsE104() {
  const hashOrAbsent = (p) => fs.existsSync(path.resolve(p)) ? sha256File(path.resolve(p)) : 'ABSENT';
  const readCanon = (p) => {
    if (!fs.existsSync(path.resolve(p))) return 'ABSENT';
    const m = fs.readFileSync(path.resolve(p), 'utf8').match(/^- canonical_fingerprint:\s*([a-f0-9]{64})/m);
    return m ? m[1] : 'ABSENT';
  };

  return {
    e97_canonical_fingerprint: readCanon('reports/evidence/E97/CLOSEOUT.md'),
    e99_canonical_fingerprint: readCanon('reports/evidence/E99/CLOSEOUT.md'),
    e100_canonical_fingerprint: readCanon('reports/evidence/E100/CLOSEOUT.md'),
    e101_canonical_fingerprint: readCanon('reports/evidence/E101/CLOSEOUT.md'),
    e102_canonical_fingerprint: readCanon('reports/evidence/E102/CLOSEOUT.md'),
    e103_canonical_fingerprint: readCanon('reports/evidence/E103/CLOSEOUT.md'),
    foundation_ci_hash: hashOrAbsent('scripts/verify/foundation_ci.mjs'),
    foundation_paths_hash: hashOrAbsent('scripts/verify/foundation_paths.mjs'),
    foundation_git_hash: hashOrAbsent('scripts/verify/foundation_git.mjs'),
    foundation_sums_hash: hashOrAbsent('scripts/verify/foundation_sums.mjs'),
    foundation_lock_hash: hashOrAbsent('scripts/verify/foundation_lock.mjs'),
    foundation_render_hash: hashOrAbsent('scripts/verify/foundation_render.mjs')
  };
}

/**
 * Evidence fingerprint for E104
 * Excludes CLOSEOUT/VERDICT/BUNDLE_HASH* to avoid circular dependency
 */
export function evidenceFingerprintE104() {
  const coreReq = [
    'PREFLIGHT.md',
    'BASELINE_FINGERPRINTS.md',
    'POST_FINGERPRINTS.md',
    'FINGERPRINT_INVARIANCE_COURT.md',
    'CONTRACTS_SUMMARY.md',
    'PERF_BASELINE.md',
    'PERF_BUDGET_COURT.md',
    'BUNDLE_HASH_V2.md'
  ];

  // Check all core files exist
  if (coreReq.some(f => !fs.existsSync(path.join(E104_ROOT, f)))) return '';

  const chunks = [`## ANCHORS\n${JSON.stringify(anchorsE104())}\n`];
  for (const f of coreReq) {
    const p = path.join(E104_ROOT, f);
    if (fs.existsSync(p)) {
      chunks.push(`## ${f}\n${fs.readFileSync(p, 'utf8')}`);
    }
  }

  chunks.push(`## SUMS_CORE\n${readSumsCoreText(path.join(E104_ROOT, 'SHA256SUMS.md'), [
    ' reports/evidence/E104/CLOSEOUT.md',
    ' reports/evidence/E104/VERDICT.md',
    ' reports/evidence/E104/SHA256SUMS.md',
    ' reports/evidence/E104/BUNDLE_HASH.md',
    ' reports/evidence/E104/BUNDLE_HASH_V2.md'
  ])}`);

  return sha256Text(chunks.join('\n'));
}
