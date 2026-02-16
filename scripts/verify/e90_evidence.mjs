#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E90_ROOT, ensureDir, readCanonicalFingerprintFromMd, rewriteSumsE90, verifySumsE90, evidenceFingerprintE90, anchorsE90 } from './e90_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E90_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E90_EVIDENCE forbidden in CI');
ensureDir(E90_ROOT);
if(update&&process.env.CI!=='true'){
  writeMd(path.join(E90_ROOT,'CLOSEOUT.md'),'# E90 CLOSEOUT\n- canonical_fingerprint: pending');
  writeMd(path.join(E90_ROOT,'VERDICT.md'),'# E90 VERDICT\n- canonical_fingerprint: pending');
  rewriteSumsE90();
  let canon=evidenceFingerprintE90();
  const closeout=(fp)=>['# E90 CLOSEOUT','- status: PASS',...Object.entries(anchorsE90()).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>`- ${k}: ${v}`),`- canonical_fingerprint: ${fp}`,'- exact_commands: npm ci; CI=false UPDATE_E90_EVIDENCE=1 CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e90:update; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e90; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e90'].join('\n');
  const verdict=(fp)=>['# E90 VERDICT','- status: PASS','- gates: PASS',`- canonical_fingerprint: ${fp}`].join('\n');
  writeMd(path.join(E90_ROOT,'CLOSEOUT.md'),closeout(canon));
  writeMd(path.join(E90_ROOT,'VERDICT.md'),verdict(canon));
  rewriteSumsE90();
  canon=evidenceFingerprintE90();
  writeMd(path.join(E90_ROOT,'CLOSEOUT.md'),closeout(canon));
  writeMd(path.join(E90_ROOT,'VERDICT.md'),verdict(canon));
  rewriteSumsE90();
}
const req=['PREFLIGHT.md','METAMORPHIC_SUITE.md','METAMORPHIC_ASSERTIONS.md','DATE_BOUNDARY_FUZZ.md','RUNS_METAMORPHIC_X2.md','PERF_NOTES.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md'];
for(const f of req) if(!fs.existsSync(path.join(E90_ROOT,f))) throw new Error(`missing ${f}`);
const c=readCanonicalFingerprintFromMd(path.join(E90_ROOT,'CLOSEOUT.md')),v=readCanonicalFingerprintFromMd(path.join(E90_ROOT,'VERDICT.md')),r=evidenceFingerprintE90();
if(!c||!v||!r||c!==v||c!==r) throw new Error('canonical parity violation');
verifySumsE90();
console.log('verify:e90:evidence PASSED');
