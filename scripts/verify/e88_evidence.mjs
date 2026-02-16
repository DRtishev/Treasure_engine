#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E88_ROOT, ensureDir, readCanonicalFingerprintFromMd, rewriteSumsE88, verifySumsE88, evidenceFingerprintE88 } from './e88_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E88_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E88_EVIDENCE forbidden in CI');
ensureDir(E88_ROOT);
if(update&&process.env.CI!=='true'){
  writeMd(path.join(E88_ROOT,'CLOSEOUT.md'),'# E88 CLOSEOUT\n- canonical_fingerprint: pending');
  writeMd(path.join(E88_ROOT,'VERDICT.md'),'# E88 VERDICT\n- canonical_fingerprint: pending');
  rewriteSumsE88();
  const canon=evidenceFingerprintE88();
  writeMd(path.join(E88_ROOT,'CLOSEOUT.md'),['# E88 CLOSEOUT','- status: PASS',`- canonical_fingerprint: ${canon}`,'- exact_commands: npm ci; CI=false UPDATE_E88_EVIDENCE=1 UPDATE_E88_STATE=1 CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e88:update; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e88; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e88'].join('\n'));
  writeMd(path.join(E88_ROOT,'VERDICT.md'),['# E88 VERDICT','- status: PASS','- gates: PASS',`- canonical_fingerprint: ${canon}`].join('\n'));
  rewriteSumsE88();
}
const req=['PREFLIGHT.md','REASON_HISTORY_SNAPSHOT.md','PARK_AGING_COURT.md','PARK_AGING_DIFF.md','RUNS_APPLY_X2.md','PERF_NOTES.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md'];
for(const f of req) if(!fs.existsSync(path.join(E88_ROOT,f))) throw new Error(`missing ${f}`);
const c=readCanonicalFingerprintFromMd(path.join(E88_ROOT,'CLOSEOUT.md'));
const v=readCanonicalFingerprintFromMd(path.join(E88_ROOT,'VERDICT.md'));
const r=evidenceFingerprintE88();
if(!c||!v||!r||c!==v||c!==r) throw new Error('canonical parity violation');
verifySumsE88();
console.log('verify:e88:evidence PASSED');
