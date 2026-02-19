#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { rewriteSums } from './foundation_sums.mjs';
import { E133_ROOT, evidenceFingerprintE133, writeMdAtomic } from './e133_lib.mjs';
function v() { const env = { ...process.env }; delete env.UPDATE_E133_EVIDENCE; const r = spawnSync('node', ['scripts/verify/e133_evidence.mjs'], { stdio: 'inherit', env }); if ((r.status ?? 1) !== 0) throw new Error('E133_SEAL_VERIFY_FAIL'); return { c: /- canonical_fingerprint:\s*([a-f0-9]{64})/.exec(fs.readFileSync(path.join(E133_ROOT, 'CLOSEOUT.md'),'utf8'))?.[1] || 'NONE', v: /- canonical_fingerprint:\s*([a-f0-9]{64})/.exec(fs.readFileSync(path.join(E133_ROOT, 'VERDICT.md'),'utf8'))?.[1] || 'NONE', s: crypto.createHash('sha256').update(fs.readFileSync(path.join(E133_ROOT, 'SHA256SUMS.md'))).digest('hex') }; }
const a = v(), b = v(); const ok = a.c===b.c && a.v===b.v && a.s===b.s;
writeMdAtomic(path.join(E133_ROOT,'SEAL_X2.md'), ['# E133 SEAL X2', `- CLOSEOUT: ${a.c===b.c?'MATCH':'MISMATCH'}`, `- VERDICT: ${a.v===b.v?'MATCH':'MISMATCH'}`, `- SHA256SUMS: ${a.s===b.s?'MATCH':'MISMATCH'}`, `- parity_3of3: ${ok?'PASS':'FAIL'}`, `- canonical_fingerprint: ${evidenceFingerprintE133()}`].join('\n'));
rewriteSums(E133_ROOT,['SHA256SUMS.md'],'reports/evidence');
if(!ok) throw new Error('E133_SEAL_X2_FAIL');
