#!/usr/bin/env node
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { rewriteSums } from './foundation_sums.mjs';
import { E116_ROOT, evidenceFingerprintE116, writeMdAtomic, readInputBinding } from './e116_lib.mjs';

const locked = readInputBinding();
if (!locked) throw new Error('E116_BINDING_REQUIRED_FOR_SEAL');
function verify() {
  const env = { ...process.env }; delete env.UPDATE_E116_EVIDENCE;
  const r = spawnSync('node', ['scripts/verify/e116_evidence.mjs'], { stdio: 'inherit', env });
  if ((r.status ?? 1) !== 0) throw new Error('E116_SEAL_VERIFY_FAIL');
  const cur = readInputBinding();
  if (!cur || cur.pinned_capsule_dir !== locked.pinned_capsule_dir) throw new Error('E116_SEAL_REFETCH_VIOLATION');
  return evidenceFingerprintE116();
}
const h1 = verify(), h2 = verify(), h3 = verify();
const ok = h1 === h2 && h2 === h3;
writeMdAtomic(path.join(E116_ROOT, 'SEAL_X2.md'), ['# E116 SEAL X2', `- run1: ${h1}`, `- run2: ${h2}`, `- run3: ${h3}`, `- parity_3of3: ${ok ? 'PASS' : 'FAIL'}`].join('\n'));
rewriteSums(E116_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
if (!ok) throw new Error('E116_SEAL_FAIL');
console.log('e116_seal_x2: PASS');
