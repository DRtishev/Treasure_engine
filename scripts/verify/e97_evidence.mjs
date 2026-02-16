#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E97_ROOT, anchorsE97, ensureDir, evidenceFingerprintE97, readCanonicalFingerprintFromMd, rewriteSumsE97, verifySumsE97 } from './e97_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E97_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E97_EVIDENCE forbidden in CI');
ensureDir(E97_ROOT);
if(update&&process.env.CI!=='true'){
  writeMd(path.join(E97_ROOT,'CLOSEOUT.md'),'# E97 CLOSEOUT\n- canonical_fingerprint: pending');
  writeMd(path.join(E97_ROOT,'VERDICT.md'),'# E97 VERDICT\n- canonical_fingerprint: pending');
  rewriteSumsE97();
  let canon=evidenceFingerprintE97();
  const closeout=(fp)=>['# E97 CLOSEOUT','- status: PASS',...Object.entries(anchorsE97()).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>`- ${k}: ${v}`),`- canonical_fingerprint: ${fp}`,'- exact_commands: npm ci; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e96; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e96; CI=false UPDATE_E97_EVIDENCE=1 UPDATE_E97_STATE=1 CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e97:update; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e97; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e97'].join('\n');
  const verdict=(fp)=>['# E97 VERDICT','- status: PASS','- gates: PASS',`- canonical_fingerprint: ${fp}`].join('\n');
  writeMd(path.join(E97_ROOT,'CLOSEOUT.md'),closeout(canon));writeMd(path.join(E97_ROOT,'VERDICT.md'),verdict(canon));rewriteSumsE97();
  canon=evidenceFingerprintE97();writeMd(path.join(E97_ROOT,'CLOSEOUT.md'),closeout(canon));writeMd(path.join(E97_ROOT,'VERDICT.md'),verdict(canon));rewriteSumsE97();
}
const req=['PREFLIGHT.md','PROFIT_LEDGER_SNAPSHOT.md','TUNING_COURT.md','TUNING_DIFF.md','TUNING_ASSERTIONS.md','ADVERSE_SUITE.md','ADVERSE_ASSERTIONS.md','RUNS_TUNING_X2.md','PERF_NOTES.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md'];
for(const f of req) if(!fs.existsSync(path.join(E97_ROOT,f))) throw new Error(`missing ${f}`);
const c=readCanonicalFingerprintFromMd(path.join(E97_ROOT,'CLOSEOUT.md')),
  v=readCanonicalFingerprintFromMd(path.join(E97_ROOT,'VERDICT.md')),
  r=evidenceFingerprintE97();
if(!c||!v||!r||c!==v||c!==r) throw new Error('canonical parity violation');
verifySumsE97();
console.log('verify:e97:evidence PASSED');
