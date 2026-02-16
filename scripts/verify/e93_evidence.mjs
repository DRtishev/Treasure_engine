#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E93_ROOT, ensureDir, readCanonicalFingerprintFromMd, rewriteSumsE93, verifySumsE93, evidenceFingerprintE93, anchorsE93 } from './e93_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E93_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E93_EVIDENCE forbidden in CI');
ensureDir(E93_ROOT);
if(update&&process.env.CI!=='true'){
  writeMd(path.join(E93_ROOT,'CLOSEOUT.md'),'# E93 CLOSEOUT\n- canonical_fingerprint: pending');
  writeMd(path.join(E93_ROOT,'VERDICT.md'),'# E93 VERDICT\n- canonical_fingerprint: pending');
  rewriteSumsE93();
  let canon=evidenceFingerprintE93();
  const closeout=(fp)=>['# E93 CLOSEOUT','- status: PASS',...Object.entries(anchorsE93()).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>`- ${k}: ${v}`),`- canonical_fingerprint: ${fp}`,'- exact_commands: npm ci; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e92; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e92; CI=false UPDATE_E93_EVIDENCE=1 CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e93:update; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e93; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e93'].join('\n');
  const verdict=(fp)=>['# E93 VERDICT','- status: PASS','- gates: PASS',`- canonical_fingerprint: ${fp}`].join('\n');
  writeMd(path.join(E93_ROOT,'CLOSEOUT.md'),closeout(canon));
  writeMd(path.join(E93_ROOT,'VERDICT.md'),verdict(canon));
  rewriteSumsE93();
  canon=evidenceFingerprintE93();
  writeMd(path.join(E93_ROOT,'CLOSEOUT.md'),closeout(canon));
  writeMd(path.join(E93_ROOT,'VERDICT.md'),verdict(canon));
  rewriteSumsE93();
}
const req=['PREFLIGHT.md','POST_APPLY_VALIDATE.md','POST_APPLY_ASSERTIONS.md','PROMOTION_READINESS.md','PROMOTION_ASSERTIONS.md','RUNS_PROMOTION_X2.md','PERF_NOTES.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md'];
for(const f of req) if(!fs.existsSync(path.join(E93_ROOT,f))) throw new Error(`missing ${f}`);
const c=readCanonicalFingerprintFromMd(path.join(E93_ROOT,'CLOSEOUT.md')),v=readCanonicalFingerprintFromMd(path.join(E93_ROOT,'VERDICT.md')),r=evidenceFingerprintE93();
if(!c||!v||!r||c!==v||c!==r) throw new Error('canonical parity violation');
verifySumsE93();
console.log('verify:e93:evidence PASSED');
