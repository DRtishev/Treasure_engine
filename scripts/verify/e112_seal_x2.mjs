#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { evidenceFingerprintE112, E112_ROOT, writeMdAtomic } from './e112_lib.mjs';

if (process.env.UPDATE_E112_EVIDENCE !== '1') throw new Error('UPDATE_E112_EVIDENCE=1 required');
const run = () => {
  const r = spawnSync('node', ['scripts/verify/e112_evidence.mjs'], { stdio: 'inherit', env: { ...process.env, CI: 'false', UPDATE_E112_EVIDENCE: '1' } });
  if ((r.status ?? 1) !== 0) throw new Error('E112_SEAL_X2_STEP_FAIL');
  return evidenceFingerprintE112();
};
const h1 = run();
const h2 = run();
const pass = h1 === h2;
writeMdAtomic(path.join(E112_ROOT, 'SEAL_X2.md'), ['# E112 SEAL X2', `- run1: ${h1}`, `- run2: ${h2}`, `- parity: ${pass ? 'PASS' : 'FAIL'}`].join('\n'));
if (!pass) throw new Error('E112_SEAL_X2_FAIL');
console.log('e112_seal_x2: PASS');
