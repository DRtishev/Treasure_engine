#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E91_ROOT, ensureDir, readCanonicalFingerprintFromMd, rewriteSumsE91, verifySumsE91, evidenceFingerprintE91, anchorsE91 } from './e91_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E91_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E91_EVIDENCE forbidden in CI');
ensureDir(E91_ROOT);
if(update&&process.env.CI!=='true'){
  writeMd(path.join(E91_ROOT,'CLOSEOUT.md'),'# E91 CLOSEOUT\n- canonical_fingerprint: pending');
  writeMd(path.join(E91_ROOT,'VERDICT.md'),'# E91 VERDICT\n- canonical_fingerprint: pending');
  rewriteSumsE91();
  let canon=evidenceFingerprintE91();
  const closeout=(fp)=>['# E91 CLOSEOUT','- status: PASS',...Object.entries(anchorsE91()).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>`- ${k}: ${v}`),`- canonical_fingerprint: ${fp}`,'- exact_commands: npm ci; CI=false UPDATE_E91_EVIDENCE=1 CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e91:update; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e91; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e91'].join('\n');
  const verdict=(fp)=>['# E91 VERDICT','- status: PASS','- gates: PASS',`- canonical_fingerprint: ${fp}`].join('\n');
  writeMd(path.join(E91_ROOT,'CLOSEOUT.md'),closeout(canon));
  writeMd(path.join(E91_ROOT,'VERDICT.md'),verdict(canon));
  rewriteSumsE91();
  canon=evidenceFingerprintE91();
  writeMd(path.join(E91_ROOT,'CLOSEOUT.md'),closeout(canon));
  writeMd(path.join(E91_ROOT,'VERDICT.md'),verdict(canon));
  rewriteSumsE91();
}
const req=['PREFLIGHT.md','SPARSITY_SUITE.md','SPARSITY_ASSERTIONS.md','RUNS_SPARSITY_X2.md','PERF_NOTES.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md'];
for(const f of req) if(!fs.existsSync(path.join(E91_ROOT,f))) throw new Error(`missing ${f}`);
const c=readCanonicalFingerprintFromMd(path.join(E91_ROOT,'CLOSEOUT.md')),v=readCanonicalFingerprintFromMd(path.join(E91_ROOT,'VERDICT.md')),r=evidenceFingerprintE91();
if(!c||!v||!r||c!==v||c!==r) throw new Error('canonical parity violation');
verifySumsE91();
console.log('verify:e91:evidence PASSED');
