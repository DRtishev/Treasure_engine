#!/usr/bin/env node
// E106 Porcelain Contract - Enhanced parser validation
import { E106_PORCELAIN_VECTORS, parsePorcelainLine } from './e106_porcelain_vectors.mjs';
import { writeMd } from './e66_lib.mjs';
import path from 'node:path';

const EVIDENCE_PATH = path.resolve('reports/evidence/E106/PORCELAIN_VECTORS.md');
const updateEvidence = process.env.UPDATE_E106_EVIDENCE === '1';

function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

const results = [];
let passed = 0;
let failed = 0;

for (const vector of E106_PORCELAIN_VECTORS) {
  const actual = parsePorcelainLine(vector.line);
  const match = deepEqual(actual, vector.expected);

  results.push({
    line: vector.line,
    expected: vector.expected,
    actual,
    status: match ? 'PASS' : 'FAIL'
  });

  if (match) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${vector.line}`);
    console.error(`  Expected: ${JSON.stringify(vector.expected)}`);
    console.error(`  Actual:   ${JSON.stringify(actual)}`);
  }
}

console.log(`e106:porcelain_contract: ${passed} passed, ${failed} failed (total ${E106_PORCELAIN_VECTORS.length})`);

// Generate evidence
if (updateEvidence) {
  const lines = [
    '# E106 PORCELAIN VECTORS',
    '',
    '## Test Vectors',
    `- total: ${E106_PORCELAIN_VECTORS.length}`,
    `- passed: ${passed}`,
    `- failed: ${failed}`,
    '',
    '## Coverage',
    '- Basic status codes (M, A, D, ??)',
    '- Paths with spaces (quoted)',
    '- Renames (R) with and without spaces',
    '- Copies (C)',
    '- Subdirectories and deep nesting',
    '- Special characters in paths',
    '- Mixed status (AM, MD, RM)',
    '- Submodules',
    '',
    '## Results',
    ''
  ];

  for (const result of results) {
    lines.push(`### ${result.status}: \`${result.line}\``);
    lines.push(`- expected.xy: ${result.expected.xy}`);
    lines.push(`- expected.path: ${result.expected.path}`);
    lines.push(`- expected.path2: ${result.expected.path2 || 'null'}`);
    lines.push(`- actual.xy: ${result.actual?.xy || 'null'}`);
    lines.push(`- actual.path: ${result.actual?.path || 'null'}`);
    lines.push(`- actual.path2: ${result.actual?.path2 || 'null'}`);
    lines.push('');
  }

  lines.push('## Verdict');
  lines.push(`${failed === 0 ? 'PASS' : 'FAIL'} - ${passed}/${E106_PORCELAIN_VECTORS.length} vectors passed`);

  writeMd(EVIDENCE_PATH, lines.join('\n'));
}

if (failed > 0) {
  console.error('e106:porcelain_contract FAILED');
  process.exit(1);
}

console.log('e106:porcelain_contract PASSED');
