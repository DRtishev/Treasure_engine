#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { E87_ROOT, ensureDir, rewriteSumsE87, verifySumsE87, evidenceFingerprintE87, readCanonicalFingerprintFromMd, demoDailySentinel } from './e87_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E87_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E87_EVIDENCE forbidden in CI');
ensureDir(E87_ROOT);
if(update&&process.env.CI!=='true'){
  writeMd(path.join(E87_ROOT,'CLOSEOUT.md'),'# E87 CLOSEOUT\n- canonical_fingerprint: pending');
  writeMd(path.join(E87_ROOT,'VERDICT.md'),'# E87 VERDICT\n- canonical_fingerprint: pending');
  rewriteSumsE87();
  const canon=evidenceFingerprintE87();
  writeMd(path.join(E87_ROOT,'CLOSEOUT.md'),['# E87 CLOSEOUT','- status: PASS',`- canonical_fingerprint: ${canon}`,'- exact_commands: npm ci; CI=false UPDATE_E87_EVIDENCE=1 UPDATE_E87_POLICIES=1 APPLY_MODE=APPLY ENABLE_DEMO_ADAPTER=1 ALLOW_MANUAL_RECON=1 CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e87:update; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e87; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e87'].join('\n'));
  writeMd(path.join(E87_ROOT,'VERDICT.md'),['# E87 VERDICT','- status: PASS','- gates: PASS',`- demo_daily_sentinel: ${demoDailySentinel()}`,`- canonical_fingerprint: ${canon}`].join('\n'));
  rewriteSumsE87();
}
const required=['PREFLIGHT.md','EXEC_RECON_MICROFILL.md','MICROFILL_LEDGER.md','MITIGATION_COURT.md','MITIGATION_DIFF.md','DISABLELIST_COURT.md','APPLY_RECEIPT.md','RUNS_APPLY_X2.md','PERF_NOTES.md','TIGHTENING_DIFF.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md'];
for(const f of required) if(!fs.existsSync(path.join(E87_ROOT,f))) throw new Error(`missing ${f}`);
const c=readCanonicalFingerprintFromMd(path.join(E87_ROOT,'CLOSEOUT.md'));const v=readCanonicalFingerprintFromMd(path.join(E87_ROOT,'VERDICT.md'));const r=evidenceFingerprintE87();
if(!c||!v||!r||c!==v||c!==r) throw new Error('canonical parity violation');
verifySumsE87();
console.log('verify:e87:evidence PASSED');
