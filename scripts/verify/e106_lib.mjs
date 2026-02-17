#!/usr/bin/env node
// E106 Library - Anchors and fingerprinting
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text } from './e66_lib.mjs';
import { readSumsCoreText } from './foundation_sums.mjs';

export const E106_ROOT = path.resolve('reports/evidence/E106');

/**
 * E106 Anchors - dependencies from prior epochs + foundation modules
 */
export function anchorsE106() {
  const hashOrAbsent = (p) => fs.existsSync(path.resolve(p)) ? sha256File(path.resolve(p)) : 'ABSENT';
  const readCanon = (p) => {
    if (!fs.existsSync(path.resolve(p))) return 'ABSENT';
    const m = fs.readFileSync(path.resolve(p), 'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
    return m ? m[1] : 'ABSENT';
  };

  return {
    // Prior epoch fingerprints
    e97_canonical_fingerprint: readCanon('reports/evidence/E97/CLOSEOUT.md'),
    e100_canonical_fingerprint: readCanon('reports/evidence/E100/CLOSEOUT.md'),
    e101_canonical_fingerprint: readCanon('reports/evidence/E101/CLOSEOUT.md'),
    e103_canonical_fingerprint: readCanon('reports/evidence/E103/CLOSEOUT.md'),
    e104_canonical_fingerprint: readCanon('reports/evidence/E104/CLOSEOUT.md'),
    e105_canonical_fingerprint: readCanon('reports/evidence/E105/CLOSEOUT.md'),

    // Foundation module hashes
    foundation_ci_hash: hashOrAbsent('scripts/verify/foundation_ci.mjs'),
    foundation_paths_hash: hashOrAbsent('scripts/verify/foundation_paths.mjs'),
    foundation_sums_hash: hashOrAbsent('scripts/verify/foundation_sums.mjs'),
    foundation_lock_hash: hashOrAbsent('scripts/verify/foundation_lock.mjs'),
    foundation_render_hash: hashOrAbsent('scripts/verify/foundation_render.mjs'),
    foundation_git_hash: hashOrAbsent('scripts/verify/foundation_git.mjs')
  };
}

/**
 * E106 Evidence Fingerprint (excludes CLOSEOUT/VERDICT)
 */
export function evidenceFingerprintE106() {
  const coreReq = [
    'PREFLIGHT.md',
    'BASELINE_FINGERPRINTS.md',
    'POST_FINGERPRINTS.md',
    'INVARIANCE_COURT.md',
    'PORCELAIN_VECTORS.md',
    'FOUNDATION_SELFTEST.md',
    'PERF_TREND.md',
    'CONTRACTS_SUMMARY.md',
    'PERF_NOTES.md'
  ];

  // Check if all required files exist
  if (coreReq.some(f => !fs.existsSync(path.join(E106_ROOT, f)))) {
    return '';
  }

  const chunks = [`## ANCHORS\n${JSON.stringify(anchorsE106())}\n`];
  for (const f of coreReq) {
    chunks.push(`## ${f}\n${fs.readFileSync(path.join(E106_ROOT, f), 'utf8')}`);
  }

  // Add SEAL_X2 if exists
  if (fs.existsSync(path.join(E106_ROOT, 'SEAL_X2.md'))) {
    chunks.push(`## SEAL_X2.md\n${fs.readFileSync(path.join(E106_ROOT, 'SEAL_X2.md'), 'utf8')}`);
  }

  chunks.push(`## SUMS_CORE\n${readSumsCoreText(path.join(E106_ROOT, 'SHA256SUMS.md'), [
    ' reports/evidence/E106/CLOSEOUT.md',
    ' reports/evidence/E106/VERDICT.md',
    ' reports/evidence/E106/SHA256SUMS.md'
  ])}`);

  return sha256Text(chunks.join('\n'));
}
