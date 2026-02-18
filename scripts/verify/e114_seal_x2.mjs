#!/usr/bin/env node
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { rewriteSums } from './foundation_sums.mjs';
import { E114_ROOT, evidenceFingerprintE114, writeMdAtomic } from './e114_lib.mjs';
function verify(){ const env={...process.env}; delete env.UPDATE_E114_EVIDENCE; const r=spawnSync('node',['scripts/verify/e114_evidence.mjs'],{stdio:'inherit',env}); if((r.status??1)!==0) throw new Error('E114_SEAL_VERIFY_FAIL'); return evidenceFingerprintE114(); }
const h1=verify(),h2=verify(),h3=verify(); const ok=h1===h2&&h2===h3;
writeMdAtomic(path.join(E114_ROOT,'SEAL_X2.md'),['# E114 SEAL X2',`- run1: ${h1}`,`- run2: ${h2}`,`- run3: ${h3}`,`- parity_3of3: ${ok?'PASS':'FAIL'}`].join('\n'));
rewriteSums(E114_ROOT,['SHA256SUMS.md'],'reports/evidence'); if(!ok) throw new Error('E114_SEAL_FAIL'); console.log('e114_seal_x2: PASS');
