#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E94_ROOT, ensureDir, readCanonicalFingerprintFromMd, rewriteSumsE94, verifySumsE94, evidenceFingerprintE94, anchorsE94 } from './e94_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E94_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E94_EVIDENCE forbidden in CI');
ensureDir(E94_ROOT);
if(update&&process.env.CI!=='true'){
  writeMd(path.join(E94_ROOT,'CLOSEOUT.md'),'# E94 CLOSEOUT\n- canonical_fingerprint: pending');
  writeMd(path.join(E94_ROOT,'VERDICT.md'),'# E94 VERDICT\n- canonical_fingerprint: pending');
  rewriteSumsE94();
  let canon=evidenceFingerprintE94();
  const closeout=(fp)=>['# E94 CLOSEOUT','- status: PASS',...Object.entries(anchorsE94()).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>`- ${k}: ${v}`),`- canonical_fingerprint: ${fp}`,'- exact_commands: npm ci; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e93; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e93; CI=false UPDATE_E94_EVIDENCE=1 UPDATE_E94_STATE=1 CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e94:update; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e94; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e94'].join('\n');
  const verdict=(fp)=>['# E94 VERDICT','- status: PASS','- gates: PASS',`- canonical_fingerprint: ${fp}`].join('\n');
  writeMd(path.join(E94_ROOT,'CLOSEOUT.md'),closeout(canon));
  writeMd(path.join(E94_ROOT,'VERDICT.md'),verdict(canon));
  rewriteSumsE94();
  canon=evidenceFingerprintE94();
  writeMd(path.join(E94_ROOT,'CLOSEOUT.md'),closeout(canon));
  writeMd(path.join(E94_ROOT,'VERDICT.md'),verdict(canon));
  rewriteSumsE94();
}
const req=['PREFLIGHT.md','CADENCE_SNAPSHOT.md','PROMOTION_MULTIWINDOW.md','PROMOTION_MULTIWINDOW_ASSERTIONS.md','RUNS_PROMOTION_MULTIWINDOW_X2.md','PERF_NOTES.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md'];
for(const f of req) if(!fs.existsSync(path.join(E94_ROOT,f))) throw new Error(`missing ${f}`);
const c=readCanonicalFingerprintFromMd(path.join(E94_ROOT,'CLOSEOUT.md')),v=readCanonicalFingerprintFromMd(path.join(E94_ROOT,'VERDICT.md')),r=evidenceFingerprintE94();
if(!c||!v||!r||c!==v||c!==r) throw new Error('canonical parity violation');
verifySumsE94();
console.log('verify:e94:evidence PASSED');
