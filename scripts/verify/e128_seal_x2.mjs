#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { rewriteSums } from './foundation_sums.mjs';
import { E128_ROOT, evidenceFingerprintE128, writeMdAtomic } from './e128_lib.mjs';

function verifyOnce(){
  const env={...process.env}; delete env.UPDATE_E128_EVIDENCE;
  const r=spawnSync('node',['scripts/verify/e128_evidence.mjs'],{stdio:'inherit',env}); if((r.status??1)!==0) throw new Error('E128_SEAL_VERIFY_FAIL');
  return {close:/- canonical_fingerprint:\s*([a-f0-9]{64})/.exec(fs.readFileSync(path.join(E128_ROOT,'CLOSEOUT.md'),'utf8'))?.[1]||'NONE',verdict:/- canonical_fingerprint:\s*([a-f0-9]{64})/.exec(fs.readFileSync(path.join(E128_ROOT,'VERDICT.md'),'utf8'))?.[1]||'NONE',sums:crypto.createHash('sha256').update(fs.readFileSync(path.join(E128_ROOT,'SHA256SUMS.md'))).digest('hex')};
}
const a=verifyOnce(), b=verifyOnce(), ok=a.close===b.close&&a.verdict===b.verdict&&a.sums===b.sums;
writeMdAtomic(path.join(E128_ROOT,'SEAL_X2.md'),['# E128 SEAL X2',`- CLOSEOUT: ${a.close===b.close?'MATCH':'MISMATCH'}`,`- VERDICT: ${a.verdict===b.verdict?'MATCH':'MISMATCH'}`,`- SHA256SUMS: ${a.sums===b.sums?'MATCH':'MISMATCH'}`,`- parity_3of3: ${ok?'PASS':'FAIL'}`,`- canonical_fingerprint: ${evidenceFingerprintE128()}`].join('\n'));
rewriteSums(E128_ROOT,['SHA256SUMS.md'],'reports/evidence');
if(!ok) throw new Error('E128_SEAL_X2_FAIL');
