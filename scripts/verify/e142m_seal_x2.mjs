#!/usr/bin/env node
import path from 'node:path';
import { rewriteSums } from './foundation_sums.mjs';
import { ROOT, fpE142, writeMd } from './e142m_lib.mjs';

export function runSeal() {
  const fp1 = fpE142();
  const fp2 = fpE142();
  const ok = fp1 === fp2;
  writeMd(path.join(ROOT, 'SEAL_X2.md'), ['# E142_MEGA SEAL X2', `- fp1: ${fp1}`, `- fp2: ${fp2}`, `- status: ${ok?'PASS':'FAIL'}`, '## RAW', `- parity: ${ok}`].join('\n'));
  rewriteSums(ROOT, ['SHA256SUMS.md'], 'reports/evidence');
  return { ec: ok ? 0 : 1 };
}
if (process.argv[1] === new URL(import.meta.url).pathname) process.exit(runSeal().ec);
