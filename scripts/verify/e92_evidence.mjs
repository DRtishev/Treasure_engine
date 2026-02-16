#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E92_ROOT, ensureDir, readCanonicalFingerprintFromMd, rewriteSumsE92, verifySumsE92, evidenceFingerprintE92, anchorsE92 } from './e92_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E92_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E92_EVIDENCE forbidden in CI');
ensureDir(E92_ROOT);
if(update&&process.env.CI!=='true'){
  writeMd(path.join(E92_ROOT,'CLOSEOUT.md'),'# E92 CLOSEOUT\n- canonical_fingerprint: pending');
  writeMd(path.join(E92_ROOT,'VERDICT.md'),'# E92 VERDICT\n- canonical_fingerprint: pending');
  rewriteSumsE92();
  let canon=evidenceFingerprintE92();
  const closeout=(fp)=>['# E92 CLOSEOUT','- status: PASS',...Object.entries(anchorsE92()).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>`- ${k}: ${v}`),`- canonical_fingerprint: ${fp}`,'- exact_commands: npm ci; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e91; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e91; CI=false UPDATE_E92_EVIDENCE=1 CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e92:update; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e92; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e92'].join('\n');
  const verdict=(fp)=>['# E92 VERDICT','- status: PASS','- gates: PASS',`- canonical_fingerprint: ${fp}`].join('\n');
  writeMd(path.join(E92_ROOT,'CLOSEOUT.md'),closeout(canon));
  writeMd(path.join(E92_ROOT,'VERDICT.md'),verdict(canon));
  rewriteSumsE92();
  canon=evidenceFingerprintE92();
  writeMd(path.join(E92_ROOT,'CLOSEOUT.md'),closeout(canon));
  writeMd(path.join(E92_ROOT,'VERDICT.md'),verdict(canon));
  rewriteSumsE92();
}
const req=['PREFLIGHT.md','EV_DELTA_COURT.md','EV_DELTA_DIFF.md','EV_DELTA_ASSERTIONS.md','RUNS_EV_DELTA_X2.md','PERF_NOTES.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md'];
for(const f of req) if(!fs.existsSync(path.join(E92_ROOT,f))) throw new Error(`missing ${f}`);
const c=readCanonicalFingerprintFromMd(path.join(E92_ROOT,'CLOSEOUT.md')),v=readCanonicalFingerprintFromMd(path.join(E92_ROOT,'VERDICT.md')),r=evidenceFingerprintE92();
if(!c||!v||!r||c!==v||c!==r) throw new Error('canonical parity violation');
verifySumsE92();
console.log('verify:e92:evidence PASSED');
