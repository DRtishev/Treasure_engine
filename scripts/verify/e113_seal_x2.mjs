#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { E113_ROOT, evidenceFingerprintE113, writeMdAtomic } from './e113_lib.mjs';
import { rewriteSums } from './foundation_sums.mjs';

function verifyOnce() {
  const env = { ...process.env };
  delete env.UPDATE_E113_EVIDENCE;
  const r = spawnSync('node', ['scripts/verify/e113_evidence.mjs'], { stdio: 'inherit', env });
  if ((r.status ?? 1) !== 0) throw new Error('E113_SEAL_VERIFY_FAIL');
  return evidenceFingerprintE113();
}

const h1 = verifyOnce();
const h2 = verifyOnce();
const h3 = verifyOnce();
const pass = h1 === h2 && h2 === h3;
writeMdAtomic(path.join(E113_ROOT, 'SEAL_X2.md'), ['# E113 SEAL X2', `- run1: ${h1}`, `- run2: ${h2}`, `- run3: ${h3}`, `- parity_3of3: ${pass ? 'PASS' : 'FAIL'}`].join('\n'));
rewriteSums(E113_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
if (!pass) throw new Error('E113_SEAL_3OF3_FAIL');
console.log('e113_seal_x2: PASS');
