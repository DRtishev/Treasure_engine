#!/usr/bin/env node
// E108 Seal X2 - Meta-determinism proof
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File, writeMd } from './e66_lib.mjs';

const E108_ROOT = path.resolve('reports/evidence/E108');

console.log('e108:seal_x2: Running first evidence generation...');
const r1 = spawnSync('npm', ['run', '-s', 'verify:e108:update'], {
  stdio: 'pipe',
  env: { ...process.env, CI: 'false', UPDATE_E108_EVIDENCE: '1', CHAIN_MODE: 'FAST_PLUS', QUIET: '1' }
});
if ((r1.status ?? 1) !== 0) { console.error(r1.stderr?.toString()); throw new Error('First gen failed'); }

const seal1 = { closeout: sha256File(path.join(E108_ROOT, 'CLOSEOUT.md')), verdict: sha256File(path.join(E108_ROOT, 'VERDICT.md')), sums: sha256File(path.join(E108_ROOT, 'SHA256SUMS.md')) };
console.log(`e108:seal_x2: Seal 1: CO=${seal1.closeout.slice(0,16)} V=${seal1.verdict.slice(0,16)} S=${seal1.sums.slice(0,16)}`);

await new Promise(r => setTimeout(r, 100));

console.log('e108:seal_x2: Running second evidence generation...');
const r2 = spawnSync('npm', ['run', '-s', 'verify:e108:update'], {
  stdio: 'pipe',
  env: { ...process.env, CI: 'false', UPDATE_E108_EVIDENCE: '1', CHAIN_MODE: 'FAST_PLUS', QUIET: '1' }
});
if ((r2.status ?? 1) !== 0) { console.error(r2.stderr?.toString()); throw new Error('Second gen failed'); }

const seal2 = { closeout: sha256File(path.join(E108_ROOT, 'CLOSEOUT.md')), verdict: sha256File(path.join(E108_ROOT, 'VERDICT.md')), sums: sha256File(path.join(E108_ROOT, 'SHA256SUMS.md')) };
console.log(`e108:seal_x2: Seal 2: CO=${seal2.closeout.slice(0,16)} V=${seal2.verdict.slice(0,16)} S=${seal2.sums.slice(0,16)}`);

const match = seal1.closeout === seal2.closeout && seal1.verdict === seal2.verdict && seal1.sums === seal2.sums;

const evidence = [
  '# E108 SEAL X2', '',
  '## Meta-Determinism Proof',
  'Evidence generation run twice to prove deterministic output.', '',
  '## Seal 1',
  `- CLOSEOUT.md: ${seal1.closeout}`,
  `- VERDICT.md: ${seal1.verdict}`,
  `- SHA256SUMS.md: ${seal1.sums}`, '',
  '## Seal 2',
  `- CLOSEOUT.md: ${seal2.closeout}`,
  `- VERDICT.md: ${seal2.verdict}`,
  `- SHA256SUMS.md: ${seal2.sums}`, '',
  '## Comparison',
  `- CLOSEOUT: ${seal1.closeout === seal2.closeout ? 'MATCH' : 'MISMATCH'}`,
  `- VERDICT: ${seal1.verdict === seal2.verdict ? 'MATCH' : 'MISMATCH'}`,
  `- SHA256SUMS: ${seal1.sums === seal2.sums ? 'MATCH' : 'MISMATCH'}`, '',
  '## Verdict',
  `${match ? 'PASS' : 'FAIL'} - Evidence generation is ${match ? '' : 'NOT '}deterministic`
].join('\n');

writeMd(path.join(E108_ROOT, 'SEAL_X2.md'), evidence);

if (!match) { console.error('e108:seal_x2 FAILED'); process.exit(1); }
console.log('e108:seal_x2 PASSED');
