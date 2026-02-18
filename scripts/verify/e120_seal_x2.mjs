#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { rewriteSums } from './foundation_sums.mjs';
import { E120_ROOT, evidenceFingerprintE120, writeMdAtomic } from './e120_lib.mjs';

function verify() {
  const env = { ...process.env }; delete env.UPDATE_E120_EVIDENCE;
  const r = spawnSync('node', ['scripts/verify/e120_evidence.mjs'], { stdio: 'inherit', env });
  if ((r.status ?? 1) !== 0) throw new Error('E120_SEAL_VERIFY_FAIL');
  return {
    closeout: /canonical_fingerprint:\s*([a-f0-9]{64})/.exec(fs.readFileSync(path.join(E120_ROOT, 'CLOSEOUT.md'), 'utf8'))?.[1] || 'NONE',
    verdict: /canonical_fingerprint:\s*([a-f0-9]{64})/.exec(fs.readFileSync(path.join(E120_ROOT, 'VERDICT.md'), 'utf8'))?.[1] || 'NONE',
    sums: crypto.createHash('sha256').update(fs.readFileSync(path.join(E120_ROOT, 'SHA256SUMS.md'))).digest('hex')
  };
}
const a = verify(); const b = verify();
const ok = a.closeout === b.closeout && a.verdict === b.verdict && a.sums === b.sums;
writeMdAtomic(path.join(E120_ROOT, 'SEAL_X2.md'), ['# E120 SEAL X2', `- CLOSEOUT: ${a.closeout === b.closeout ? 'MATCH' : 'MISMATCH'}`, `- VERDICT: ${a.verdict === b.verdict ? 'MATCH' : 'MISMATCH'}`, `- SHA256SUMS: ${a.sums === b.sums ? 'MATCH' : 'MISMATCH'}`, `- parity_3of3: ${ok ? 'PASS' : 'FAIL'}`, `- canonical_fingerprint: ${evidenceFingerprintE120()}`].join('\n'));
rewriteSums(E120_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
if (!ok) throw new Error('E120_SEAL_X2_FAIL');
