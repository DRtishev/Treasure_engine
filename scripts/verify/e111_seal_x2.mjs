#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { E111_ROOT, evidenceFingerprintE111 } from './e111_lib.mjs';

if (process.env.UPDATE_E111_EVIDENCE !== '1') throw new Error('UPDATE_E111_EVIDENCE=1 required');
const run = () => {
  const r = spawnSync('node', ['scripts/verify/e111_evidence.mjs'], { stdio: 'inherit', env: { ...process.env, UPDATE_E111_EVIDENCE: '1', CI: 'false' } });
  if ((r.status ?? 1) !== 0) throw new Error('evidence run failed');
  return evidenceFingerprintE111();
};
const h1 = run();
const h2 = run();
const pass = h1 === h2;
fs.writeFileSync(path.join(E111_ROOT, 'SEAL_X2.md'), [
  '# E111 SEAL X2',
  `- run1: ${h1}`,
  `- run2: ${h2}`,
  `- parity: ${pass ? 'PASS' : 'FAIL'}`
].join('\n'));
if (!pass) throw new Error('SEAL_X2_FAIL');
console.log('e111_seal_x2 PASS');
