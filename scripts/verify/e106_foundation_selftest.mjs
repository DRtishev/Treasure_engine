#!/usr/bin/env node
// E106 Foundation Module Self-Tests
// Deterministic unit-like tests for foundation modules

import fs from 'node:fs';
import path from 'node:path';
import { isCIMode, forbidEnvInCI } from './foundation_ci.mjs';
import { writeMd } from './e66_lib.mjs';
import { rewriteSums, verifySums, readSumsCoreText } from './foundation_sums.mjs';
import { parsePorcelainLine } from './e106_porcelain_vectors.mjs';

const EVIDENCE_PATH = path.resolve('reports/evidence/E106/FOUNDATION_SELFTEST.md');
const updateEvidence = process.env.UPDATE_E106_EVIDENCE === '1';

const results = [];

function test(name, fn) {
  try {
    fn();
    results.push({ name, status: 'PASS', error: null });
    return true;
  } catch (err) {
    results.push({ name, status: 'FAIL', error: err.message });
    console.error(`FAIL: ${name}`);
    console.error(`  ${err.message}`);
    return false;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

// =============================================================================
// foundation_ci tests
// =============================================================================

test('foundation_ci: isCIMode returns boolean', () => {
  const result = isCIMode();
  assert(typeof result === 'boolean', 'isCIMode must return boolean');
});

test('foundation_ci: isCIMode truthy for CI=true', () => {
  const oldCI = process.env.CI;
  process.env.CI = 'true';
  assert(isCIMode() === true, 'CI=true should be truthy');
  process.env.CI = oldCI;
});

test('foundation_ci: isCIMode truthy for CI=1', () => {
  const oldCI = process.env.CI;
  process.env.CI = '1';
  assert(isCIMode() === true, 'CI=1 should be truthy');
  process.env.CI = oldCI;
});

test('foundation_ci: isCIMode falsy for CI=false', () => {
  const oldCI = process.env.CI;
  process.env.CI = 'false';
  assert(isCIMode() === false, 'CI=false should be falsy');
  process.env.CI = oldCI;
});

test('foundation_ci: isCIMode falsy for CI=0', () => {
  const oldCI = process.env.CI;
  process.env.CI = '0';
  assert(isCIMode() === false, 'CI=0 should be falsy');
  process.env.CI = oldCI;
});

test('foundation_ci: forbidEnvInCI allows UPDATE_ when CI=false', () => {
  const oldCI = process.env.CI;
  const oldUpdate = process.env.UPDATE_TEST;
  process.env.CI = 'false';
  process.env.UPDATE_TEST = '1';
  forbidEnvInCI(); // Should not throw
  delete process.env.UPDATE_TEST;
  process.env.CI = oldCI;
});

// =============================================================================
// foundation_sums tests
// =============================================================================

test('foundation_sums: rewriteSums creates deterministic output', () => {
  const tmpDir = '/tmp/e106_sums_test';
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'a.md'), 'content A');
  fs.writeFileSync(path.join(tmpDir, 'b.md'), 'content B');

  rewriteSums(tmpDir, ['SHA256SUMS.md'], 'tmp');

  const sumsPath = path.join(tmpDir, 'SHA256SUMS.md');
  assert(fs.existsSync(sumsPath), 'SHA256SUMS.md should exist');

  const content = fs.readFileSync(sumsPath, 'utf8');
  assert(content.includes('a.md'), 'Should include a.md');
  assert(content.includes('b.md'), 'Should include b.md');

  // Verify ordering (alphabetical)
  const aIndex = content.indexOf('a.md');
  const bIndex = content.indexOf('b.md');
  assert(aIndex < bIndex, 'Files should be in alphabetical order');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('foundation_sums: verifySums detects tampering', () => {
  const tmpDir = '/tmp/e106_sums_verify_test';
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'file.md'), 'original');

  rewriteSums(tmpDir, ['SHA256SUMS.md'], 'tmp');

  // Tamper with file
  fs.writeFileSync(path.join(tmpDir, 'file.md'), 'tampered');

  let caught = false;
  try {
    verifySums(path.join(tmpDir, 'SHA256SUMS.md'), []);
  } catch (err) {
    caught = true;
  }

  assert(caught, 'verifySums should detect tampering');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('foundation_sums: readSumsCoreText excludes specified suffixes', () => {
  const tmpDir = '/tmp/e106_sums_core_test';
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'a.md'), 'content A');
  fs.writeFileSync(path.join(tmpDir, 'VERDICT.md'), 'verdict');

  rewriteSums(tmpDir, ['SHA256SUMS.md'], 'tmp');

  const coreText = readSumsCoreText(
    path.join(tmpDir, 'SHA256SUMS.md'),
    [' tmp/e106_sums_core_test/VERDICT.md', ' tmp/e106_sums_core_test/SHA256SUMS.md']
  );

  assert(coreText.includes('a.md'), 'Should include a.md');
  assert(!coreText.includes('VERDICT.md'), 'Should exclude VERDICT.md');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// =============================================================================
// foundation_git tests (via porcelain parser)
// =============================================================================

test('foundation_git: parsePorcelainLine handles basic modification', () => {
  const result = parsePorcelainLine(' M file.txt');
  assertEqual(result.xy, ' M', 'xy mismatch');
  assertEqual(result.path, 'file.txt', 'path mismatch');
  assertEqual(result.path2, null, 'path2 should be null');
});

test('foundation_git: parsePorcelainLine handles quoted paths', () => {
  const result = parsePorcelainLine(' M "file with spaces.txt"');
  assertEqual(result.xy, ' M', 'xy mismatch');
  assertEqual(result.path, 'file with spaces.txt', 'path should be unquoted');
  assertEqual(result.path2, null, 'path2 should be null');
});

test('foundation_git: parsePorcelainLine handles renames', () => {
  const result = parsePorcelainLine('R  old.txt -> new.txt');
  assertEqual(result.xy, 'R ', 'xy mismatch');
  assertEqual(result.path, 'old.txt', 'path mismatch');
  assertEqual(result.path2, 'new.txt', 'path2 mismatch');
});

test('foundation_git: parsePorcelainLine handles copies', () => {
  const result = parsePorcelainLine('C  source.txt -> dest.txt');
  assertEqual(result.xy, 'C ', 'xy mismatch');
  assertEqual(result.path, 'source.txt', 'path mismatch');
  assertEqual(result.path2, 'dest.txt', 'path2 mismatch');
});

test('foundation_git: parsePorcelainLine handles untracked', () => {
  const result = parsePorcelainLine('?? untracked.txt');
  assertEqual(result.xy, '??', 'xy mismatch');
  assertEqual(result.path, 'untracked.txt', 'path mismatch');
  assertEqual(result.path2, null, 'path2 should be null');
});

// =============================================================================
// Results
// =============================================================================

const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;

console.log(`e106:foundation_selftest: ${passed} passed, ${failed} failed (total ${results.length})`);

// Generate evidence
if (updateEvidence) {
  const lines = [
    '# E106 FOUNDATION SELFTEST',
    '',
    '## Test Summary',
    `- total: ${results.length}`,
    `- passed: ${passed}`,
    `- failed: ${failed}`,
    '',
    '## Module Coverage',
    '- foundation_ci: isCIMode, forbidEnvInCI',
    '- foundation_sums: rewriteSums, verifySums, readSumsCoreText',
    '- foundation_git: parsePorcelainLine (via e106_porcelain_vectors)',
    '',
    '## Test Results',
    ''
  ];

  for (const result of results) {
    lines.push(`### ${result.status}: ${result.name}`);
    if (result.error) {
      lines.push(`- error: ${result.error}`);
    }
    lines.push('');
  }

  lines.push('## Verdict');
  lines.push(`${failed === 0 ? 'PASS' : 'FAIL'} - All foundation modules behave correctly`);

  writeMd(EVIDENCE_PATH, lines.join('\n'));
}

if (failed > 0) {
  console.error('e106:foundation_selftest FAILED');
  process.exit(1);
}

console.log('e106:foundation_selftest PASSED');
