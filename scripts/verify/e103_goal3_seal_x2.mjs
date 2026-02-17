#!/usr/bin/env node
// E103-3: Evidence Sealing x2 - Meta-Determinism Proof
// Goal: Prove evidence generation is deterministic (seal1 == seal2)

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { E103_ROOT, ensureDir, readCanonicalFingerprintFromMd } from './e103_lib.mjs';
import { sha256File, writeMd } from './e66_lib.mjs';
import { isCIMode } from './foundation_ci.mjs';

const update = process.env.UPDATE_E103_EVIDENCE === '1';

if (isCIMode() && update) {
  throw new Error('UPDATE_E103_EVIDENCE forbidden in CI');
}

if (!update) {
  console.log('e103:goal3_seal_x2 SKIP (UPDATE_E103_EVIDENCE not set)');
  process.exit(0);
}

ensureDir(E103_ROOT);

function hashIfExists(p) {
  return fs.existsSync(p) ? sha256File(p) : 'ABSENT';
}

function runSeal(name) {
  const env = {
    ...process.env,
    CI: 'false',
    UPDATE_E101_EVIDENCE: '1',
    CHAIN_MODE: 'FAST',
    QUIET: '1',
    // Ensure deterministic timestamp
    SOURCE_DATE_EPOCH: '1700000000',
    TZ: 'UTC',
    LANG: 'C',
    LC_ALL: 'C'
  };
  delete env.UPDATE_E103_EVIDENCE;

  const r = spawnSync('npm', ['run', '-s', 'verify:e101:update'], {
    stdio: 'inherit',
    env
  });

  if ((r.status ?? 1) !== 0) {
    throw new Error(`${name} failed: exit ${r.status}`);
  }
}

// Seal 1: Generate evidence first time
console.log('=== SEAL 1: First evidence generation ===');
runSeal('seal1');

const seal1 = {
  closeout_fingerprint: readCanonicalFingerprintFromMd('reports/evidence/E101/CLOSEOUT.md'),
  verdict_fingerprint: readCanonicalFingerprintFromMd('reports/evidence/E101/VERDICT.md'),
  closeout_hash: sha256File('reports/evidence/E101/CLOSEOUT.md'),
  verdict_hash: sha256File('reports/evidence/E101/VERDICT.md'),
  sha256sums_hash: sha256File('reports/evidence/E101/SHA256SUMS.md'),
  bundle_hash_md: hashIfExists('reports/evidence/E101/BUNDLE_HASH.md'),
  bundle_hash_v2_md: hashIfExists('reports/evidence/E101/BUNDLE_HASH_V2.md')
};

// Seal 2: Regenerate evidence (should be identical)
console.log('=== SEAL 2: Second evidence generation ===');
runSeal('seal2');

const seal2 = {
  closeout_fingerprint: readCanonicalFingerprintFromMd('reports/evidence/E101/CLOSEOUT.md'),
  verdict_fingerprint: readCanonicalFingerprintFromMd('reports/evidence/E101/VERDICT.md'),
  closeout_hash: sha256File('reports/evidence/E101/CLOSEOUT.md'),
  verdict_hash: sha256File('reports/evidence/E101/VERDICT.md'),
  sha256sums_hash: sha256File('reports/evidence/E101/SHA256SUMS.md'),
  bundle_hash_md: hashIfExists('reports/evidence/E101/BUNDLE_HASH.md'),
  bundle_hash_v2_md: hashIfExists('reports/evidence/E101/BUNDLE_HASH_V2.md')
};

// Verification: All hashes must match
const deterministic =
  seal1.closeout_fingerprint === seal2.closeout_fingerprint &&
  seal1.verdict_fingerprint === seal2.verdict_fingerprint &&
  seal1.closeout_hash === seal2.closeout_hash &&
  seal1.verdict_hash === seal2.verdict_hash &&
  seal1.sha256sums_hash === seal2.sha256sums_hash &&
  seal1.bundle_hash_md === seal2.bundle_hash_md &&
  seal1.bundle_hash_v2_md === seal2.bundle_hash_v2_md;

// Generate report
const report = [
  '# E103 GOAL 3: SEAL X2',
  '',
  '## Seal 1 (First Generation)',
  `- closeout_fingerprint: ${seal1.closeout_fingerprint}`,
  `- verdict_fingerprint: ${seal1.verdict_fingerprint}`,
  `- closeout_hash: ${seal1.closeout_hash}`,
  `- verdict_hash: ${seal1.verdict_hash}`,
  `- sha256sums_hash: ${seal1.sha256sums_hash}`,
  `- bundle_hash_md: ${seal1.bundle_hash_md}`,
  `- bundle_hash_v2_md: ${seal1.bundle_hash_v2_md}`,
  '',
  '## Seal 2 (Second Generation)',
  `- closeout_fingerprint: ${seal2.closeout_fingerprint}`,
  `- verdict_fingerprint: ${seal2.verdict_fingerprint}`,
  `- closeout_hash: ${seal2.closeout_hash}`,
  `- verdict_hash: ${seal2.verdict_hash}`,
  `- sha256sums_hash: ${seal2.sha256sums_hash}`,
  `- bundle_hash_md: ${seal2.bundle_hash_md}`,
  `- bundle_hash_v2_md: ${seal2.bundle_hash_v2_md}`,
  '',
  '## Determinism Verification',
  `- closeout_fingerprint_match: ${seal1.closeout_fingerprint === seal2.closeout_fingerprint}`,
  `- verdict_fingerprint_match: ${seal1.verdict_fingerprint === seal2.verdict_fingerprint}`,
  `- closeout_hash_match: ${seal1.closeout_hash === seal2.closeout_hash}`,
  `- verdict_hash_match: ${seal1.verdict_hash === seal2.verdict_hash}`,
  `- sha256sums_hash_match: ${seal1.sha256sums_hash === seal2.sha256sums_hash}`,
  `- bundle_hash_md_match: ${seal1.bundle_hash_md === seal2.bundle_hash_md}`,
  `- bundle_hash_v2_md_match: ${seal1.bundle_hash_v2_md === seal2.bundle_hash_v2_md}`,
  '',
  '## Meta-Determinism Proof',
  `- seal1 == seal2: ${deterministic ? 'YES' : 'NO'}`,
  `- byte_for_byte_identical: ${deterministic}`,
  '',
  '## Verdict',
  `- overall: ${deterministic ? 'PASS' : 'FAIL'}`
].join('\n');

writeMd(path.join(E103_ROOT, 'GOAL_3_SEAL_X2.md'), report);

if (!deterministic) {
  const diffs = [];
  if (seal1.closeout_fingerprint !== seal2.closeout_fingerprint) diffs.push('closeout_fingerprint');
  if (seal1.verdict_fingerprint !== seal2.verdict_fingerprint) diffs.push('verdict_fingerprint');
  if (seal1.closeout_hash !== seal2.closeout_hash) diffs.push('closeout_hash');
  if (seal1.verdict_hash !== seal2.verdict_hash) diffs.push('verdict_hash');
  if (seal1.sha256sums_hash !== seal2.sha256sums_hash) diffs.push('sha256sums_hash');
  if (seal1.bundle_hash_md !== seal2.bundle_hash_md) diffs.push('bundle_hash_md');
  if (seal1.bundle_hash_v2_md !== seal2.bundle_hash_v2_md) diffs.push('bundle_hash_v2_md');
  throw new Error(`Seal x2 FAILED: non-deterministic (${diffs.join(', ')})`);
}

console.log('e103:goal3_seal_x2 PASSED (meta-determinism: seal1 == seal2)');
