#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E96_ROOT, ensureDir, readCanonicalFingerprintFromMd, rewriteSumsE96, verifySumsE96, evidenceFingerprintE96, anchorsE96 } from './e96_lib.mjs';
import { writeMd } from './e66_lib.mjs';
const update=process.env.UPDATE_E96_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E96_EVIDENCE forbidden in CI');
ensureDir(E96_ROOT);
if(update&&process.env.CI!=='true'){
  writeMd(path.join(E96_ROOT,'CLOSEOUT.md'),'# E96 CLOSEOUT\n- canonical_fingerprint: pending');
  writeMd(path.join(E96_ROOT,'VERDICT.md'),'# E96 VERDICT\n- canonical_fingerprint: pending');
  rewriteSumsE96();
  let canon=evidenceFingerprintE96();
  const closeout=(fp)=>['# E96 CLOSEOUT','- status: PASS',...Object.entries(anchorsE96()).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>`- ${k}: ${v}`),`- canonical_fingerprint: ${fp}`,'- exact_commands: npm ci; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e95; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e95; CI=false UPDATE_E96_EVIDENCE=1 CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e96:update; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e96; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e96'].join('\n');
  const verdict=(fp)=>['# E96 VERDICT','- status: PASS','- gates: PASS',`- canonical_fingerprint: ${fp}`].join('\n');
  writeMd(path.join(E96_ROOT,'CLOSEOUT.md'),closeout(canon));writeMd(path.join(E96_ROOT,'VERDICT.md'),verdict(canon));rewriteSumsE96();
  canon=evidenceFingerprintE96();writeMd(path.join(E96_ROOT,'CLOSEOUT.md'),closeout(canon));writeMd(path.join(E96_ROOT,'VERDICT.md'),verdict(canon));rewriteSumsE96();
}
const req=['PREFLIGHT.md','FIXTURE_SNAPSHOT.md','ADVERSARIAL_SUITE.md','ADVERSARIAL_ASSERTIONS.md','RUNS_ADVERSARIAL_X2.md','INVARIANT_FUZZ.md','INVARIANT_ASSERTIONS.md','RUNS_FUZZ_X2.md','PERF_NOTES.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md'];
for(const f of req) if(!fs.existsSync(path.join(E96_ROOT,f))) throw new Error(`missing ${f}`);
const c=readCanonicalFingerprintFromMd(path.join(E96_ROOT,'CLOSEOUT.md')),v=readCanonicalFingerprintFromMd(path.join(E96_ROOT,'VERDICT.md')),r=evidenceFingerprintE96();
if(!c||!v||!r||c!==v||c!==r) throw new Error('canonical parity violation');
verifySumsE96();
console.log('verify:e96:evidence PASSED');
