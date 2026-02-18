#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { rewriteSums } from './foundation_sums.mjs';
import { E127_ROOT, evidenceFingerprintE127, writeMdAtomic } from './e127_lib.mjs';

function verifyOnce(){
  const env={...process.env}; delete env.UPDATE_E127_EVIDENCE;
  const r=spawnSync('node',['scripts/verify/e127_evidence.mjs'],{stdio:'inherit',env}); if ((r.status??1)!==0) throw new Error('E127_SEAL_VERIFY_FAIL');
  return {
    close:/- canonical_fingerprint:\s*([a-f0-9]{64})/.exec(fs.readFileSync(path.join(E127_ROOT,'CLOSEOUT.md'),'utf8'))?.[1]||'NONE',
    verdict:/- canonical_fingerprint:\s*([a-f0-9]{64})/.exec(fs.readFileSync(path.join(E127_ROOT,'VERDICT.md'),'utf8'))?.[1]||'NONE',
    sums:crypto.createHash('sha256').update(fs.readFileSync(path.join(E127_ROOT,'SHA256SUMS.md'))).digest('hex')
  };
}
const a=verifyOnce(), b=verifyOnce();
const ok=a.close===b.close && a.verdict===b.verdict && a.sums===b.sums;
writeMdAtomic(path.join(E127_ROOT,'SEAL_X2.md'),['# E127 SEAL X2',`- CLOSEOUT: ${a.close===b.close?'MATCH':'MISMATCH'}`,`- VERDICT: ${a.verdict===b.verdict?'MATCH':'MISMATCH'}`,`- SHA256SUMS: ${a.sums===b.sums?'MATCH':'MISMATCH'}`,`- parity_3of3: ${ok?'PASS':'FAIL'}`,`- canonical_fingerprint: ${evidenceFingerprintE127()}`].join('\n'));
rewriteSums(E127_ROOT,['SHA256SUMS.md'],'reports/evidence');
if(!ok) throw new Error('E127_SEAL_X2_FAIL');
