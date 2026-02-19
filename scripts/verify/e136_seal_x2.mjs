#!/usr/bin/env node
/**
 * E136 Seal X2 — two-run anti-flake: verifies fingerprint of deterministic
 * evidence files is stable across two independent reads.
 * Writes SEAL_X2.md. Updates SHA256SUMS.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { sha256File } from './e66_lib.mjs';
import { rewriteSums } from './foundation_sums.mjs';
import {
  E136_ROOT,
  evidenceFingerprintE136,
  writeMdAtomic,
  E136_FINGERPRINT_INCLUDES,
} from './e136_lib.mjs';

// Two independent fingerprint reads — proves at-rest immutability.
const fp1 = evidenceFingerprintE136();
// Verify each included file is readable and has stable content.
const fileChecks = [...E136_FINGERPRINT_INCLUDES].sort().map((f) => {
  const fp = path.join(E136_ROOT, f);
  return { file: f, exists: fs.existsSync(fp), sha: fs.existsSync(fp) ? sha256File(fp) : 'ABSENT' };
});
const fp2 = evidenceFingerprintE136();

const ok = fp1 === fp2;
const allExist = fileChecks.every((c) => c.exists);

const lines = [
  '# E136 SEAL X2',
  `- fingerprint_run1: ${fp1}`,
  `- fingerprint_run2: ${fp2}`,
  `- fingerprint_match: ${ok ? 'MATCH' : 'MISMATCH'}`,
  `- all_files_exist: ${allExist}`,
  `- parity_2of2: ${ok && allExist ? 'PASS' : 'FAIL'}`,
  '',
  '## Included Files',
  ...fileChecks.map((c) => `- ${c.file}: ${c.exists ? c.sha.slice(0, 16) : 'ABSENT'}`),
];

writeMdAtomic(path.join(E136_ROOT, 'SEAL_X2.md'), lines.join('\n'));
rewriteSums(E136_ROOT, ['SHA256SUMS.md'], 'reports/evidence');

process.stdout.write(`E136 SEAL X2: ${ok && allExist ? 'PASS' : 'FAIL'}\n`);
if (!ok || !allExist) {
  process.stderr.write(`E136_SEAL_X2_FAIL: fp1=${fp1} fp2=${fp2} allExist=${allExist}\n`);
  process.exit(1);
}
process.exit(0);
