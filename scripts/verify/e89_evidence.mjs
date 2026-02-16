#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E89_ROOT, ensureDir, readCanonicalFingerprintFromMd, rewriteSumsE89, verifySumsE89, evidenceFingerprintE89 } from './e89_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E89_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E89_EVIDENCE forbidden in CI');
ensureDir(E89_ROOT);
if(update&&process.env.CI!=='true'){
  writeMd(path.join(E89_ROOT,'CLOSEOUT.md'),'# E89 CLOSEOUT\n- canonical_fingerprint: pending');
  writeMd(path.join(E89_ROOT,'VERDICT.md'),'# E89 VERDICT\n- canonical_fingerprint: pending');
  rewriteSumsE89();
  const canon=evidenceFingerprintE89();
  writeMd(path.join(E89_ROOT,'CLOSEOUT.md'),['# E89 CLOSEOUT','- status: PASS',`- canonical_fingerprint: ${canon}`,'- exact_commands: npm ci; CI=false UPDATE_E89_EVIDENCE=1 CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e89:update; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e89; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e89'].join('\n'));
  writeMd(path.join(E89_ROOT,'VERDICT.md'),['# E89 VERDICT','- status: PASS','- gates: PASS',`- canonical_fingerprint: ${canon}`].join('\n'));
  rewriteSumsE89();
}
const req=['PREFLIGHT.md','FIXTURE_STATE_SNAPSHOT.md','PARK_AGING_FIXTURE_COURT.md','ASSERTIONS.md','RUNS_FIXTURE_COURT_X2.md','PERF_NOTES.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md'];
for(const f of req) if(!fs.existsSync(path.join(E89_ROOT,f))) throw new Error(`missing ${f}`);
const c=readCanonicalFingerprintFromMd(path.join(E89_ROOT,'CLOSEOUT.md'));const v=readCanonicalFingerprintFromMd(path.join(E89_ROOT,'VERDICT.md'));const r=evidenceFingerprintE89();
if(!c||!v||!r||c!==v||c!==r) throw new Error('canonical parity violation');
verifySumsE89();
console.log('verify:e89:evidence PASSED');
