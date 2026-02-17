#!/usr/bin/env node
// E107 Seal X2 - Meta-determinism proof
// Regenerates E107 evidence twice and proves identity

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File } from './e66_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const E107_ROOT = path.resolve('reports/evidence/E107');
const SEAL_PATH = path.join(E107_ROOT, 'SEAL_X2.md');

console.log('e107:seal_x2: Running first evidence generation...');

// First seal
const result1 = spawnSync('npm', ['run', '-s', 'verify:e107:update'], {
  stdio: 'pipe',
  env: { ...process.env, CI: 'false', UPDATE_E107_EVIDENCE: '1', CHAIN_MODE: 'FAST_PLUS', QUIET: '1' }
});

if ((result1.status ?? 1) !== 0) {
  console.error('First evidence generation output:', result1.stdout?.toString(), result1.stderr?.toString());
  throw new Error('First evidence generation failed');
}

const seal1 = {
  closeout: sha256File(path.join(E107_ROOT, 'CLOSEOUT.md')),
  verdict: sha256File(path.join(E107_ROOT, 'VERDICT.md')),
  sums: sha256File(path.join(E107_ROOT, 'SHA256SUMS.md'))
};

console.log('e107:seal_x2: First seal captured');
console.log(`  CLOSEOUT: ${seal1.closeout}`);
console.log(`  VERDICT: ${seal1.verdict}`);
console.log(`  SHA256SUMS: ${seal1.sums}`);

// Wait a moment to ensure different timestamps (if any)
await new Promise(resolve => setTimeout(resolve, 100));

console.log('e107:seal_x2: Running second evidence generation...');

// Second seal
const result2 = spawnSync('npm', ['run', '-s', 'verify:e107:update'], {
  stdio: 'pipe',
  env: { ...process.env, CI: 'false', UPDATE_E107_EVIDENCE: '1', CHAIN_MODE: 'FAST_PLUS', QUIET: '1' }
});

if ((result2.status ?? 1) !== 0) {
  console.error('Second evidence generation output:', result2.stdout?.toString(), result2.stderr?.toString());
  throw new Error('Second evidence generation failed');
}

const seal2 = {
  closeout: sha256File(path.join(E107_ROOT, 'CLOSEOUT.md')),
  verdict: sha256File(path.join(E107_ROOT, 'VERDICT.md')),
  sums: sha256File(path.join(E107_ROOT, 'SHA256SUMS.md'))
};

console.log('e107:seal_x2: Second seal captured');
console.log(`  CLOSEOUT: ${seal2.closeout}`);
console.log(`  VERDICT: ${seal2.verdict}`);
console.log(`  SHA256SUMS: ${seal2.sums}`);

// Compare
const closeoutMatch = seal1.closeout === seal2.closeout;
const verdictMatch = seal1.verdict === seal2.verdict;
const sumsMatch = seal1.sums === seal2.sums;

console.log('e107:seal_x2: Comparison');
console.log(`  CLOSEOUT: ${closeoutMatch ? 'MATCH' : 'MISMATCH'}`);
console.log(`  VERDICT: ${verdictMatch ? 'MATCH' : 'MISMATCH'}`);
console.log(`  SHA256SUMS: ${sumsMatch ? 'MATCH' : 'MISMATCH'}`);

// Generate evidence
const evidence = [
  '# E107 SEAL X2',
  '',
  '## Meta-Determinism Proof',
  'Evidence generation run twice (back-to-back) to prove deterministic output.',
  '',
  '## Seal 1',
  `- CLOSEOUT.md: ${seal1.closeout}`,
  `- VERDICT.md: ${seal1.verdict}`,
  `- SHA256SUMS.md: ${seal1.sums}`,
  '',
  '## Seal 2',
  `- CLOSEOUT.md: ${seal2.closeout}`,
  `- VERDICT.md: ${seal2.verdict}`,
  `- SHA256SUMS.md: ${seal2.sums}`,
  '',
  '## Comparison',
  `- CLOSEOUT: ${closeoutMatch ? 'MATCH' : 'MISMATCH'}`,
  `- VERDICT: ${verdictMatch ? 'MATCH' : 'MISMATCH'}`,
  `- SHA256SUMS: ${sumsMatch ? 'MATCH' : 'MISMATCH'}`,
  '',
  '## Verdict',
  `${closeoutMatch && verdictMatch && sumsMatch ? 'PASS' : 'FAIL'} - Evidence generation is ${closeoutMatch && verdictMatch && sumsMatch ? '' : 'NOT '}deterministic`
].join('\n');

writeMd(SEAL_PATH, evidence);

if (!closeoutMatch || !verdictMatch || !sumsMatch) {
  console.error('e107:seal_x2 FAILED - Evidence generation is not deterministic');
  process.exit(1);
}

console.log('e107:seal_x2 PASSED');
