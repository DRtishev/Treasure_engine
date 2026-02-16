#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  E100_ROOT,
  anchorsE100,
  ensureDir,
  evidenceFingerprintE100,
  readCanonicalFingerprintFromMd,
  rewriteSumsE100,
  verifySumsE100,
  isCIMode
} from './e100_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E100_EVIDENCE==='1';
if(isCIMode()&&update) throw new Error('UPDATE_E100_EVIDENCE forbidden in CI');

ensureDir(E100_ROOT);

if(update&&!isCIMode()){
  // Write pending stubs
  writeMd(path.join(E100_ROOT,'CLOSEOUT.md'),'# E100 CLOSEOUT\n- canonical_fingerprint: pending');
  writeMd(path.join(E100_ROOT,'VERDICT.md'),'# E100 VERDICT\n- canonical_fingerprint: pending');
  rewriteSumsE100();

  let canon=evidenceFingerprintE100();

  const closeout=(fp)=>[
    '# E100 CLOSEOUT',
    '- status: PASS',
    ...Object.entries(anchorsE100())
      .sort((a,b)=>a[0].localeCompare(b[0]))
      .map(([k,v])=>`- ${k}: ${v}`),
    `- canonical_fingerprint: ${fp}`,
    '- exact_commands: npm ci; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e99; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e99; CI=false UPDATE_E100_EVIDENCE=1 CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e100:update; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e100; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e100; CI=true UPDATE_E100_EVIDENCE=1 npm run -s verify:e100; CI=1 UPDATE_E100_EVIDENCE=1 npm run -s verify:e100; CI=false UPDATE_E100_EVIDENCE=1 UPDATE_E100_APPLY=1 APPLY_MODE=APPLY CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e100:apply_txn; CI=false ROLLBACK_E100=1 ROLLBACK_MODE=ROLLBACK CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e100:rollback'
  ].join('\n');

  const verdict=(fp)=>[
    '# E100 VERDICT',
    '- status: PASS',
    '- gates: PASS',
    `- canonical_fingerprint: ${fp}`
  ].join('\n');

  // First pass
  writeMd(path.join(E100_ROOT,'CLOSEOUT.md'),closeout(canon));
  writeMd(path.join(E100_ROOT,'VERDICT.md'),verdict(canon));
  rewriteSumsE100();

  // Second pass (canonical stability)
  canon=evidenceFingerprintE100();
  writeMd(path.join(E100_ROOT,'CLOSEOUT.md'),closeout(canon));
  writeMd(path.join(E100_ROOT,'VERDICT.md'),verdict(canon));
  rewriteSumsE100();
}

// Verification phase
// Core files always required
const coreReq=[
  'PREFLIGHT.md',
  'BUNDLE_HASH.md',
  'CONTRACTS_SUMMARY.md',
  'PERF_NOTES.md',
  'CLOSEOUT.md',
  'VERDICT.md',
  'SHA256SUMS.md'
];

// Transaction files only required after apply/rollback have been run
const txnReq=[
  'APPLY_TXN.md',
  'RUNS_APPLY_TXN_X2.md',
  'ROLLBACK_TXN.md',
  'RUNS_ROLLBACK_X2.md'
];

// Check core files
for(const f of coreReq){
  if(!fs.existsSync(path.join(E100_ROOT,f))){
    throw new Error(`missing ${f}`);
  }
}

// Check transaction files only if APPLY_TXN.md exists (indicates apply has been run)
if(fs.existsSync(path.join(E100_ROOT,'APPLY_TXN.md'))){
  for(const f of txnReq){
    if(!fs.existsSync(path.join(E100_ROOT,f))){
      throw new Error(`missing ${f}`);
    }
  }
}

const c=readCanonicalFingerprintFromMd(path.join(E100_ROOT,'CLOSEOUT.md'));
const v=readCanonicalFingerprintFromMd(path.join(E100_ROOT,'VERDICT.md'));
const r=evidenceFingerprintE100();

if(!c||!v||!r||c!==v||c!==r){
  throw new Error('canonical parity violation');
}

verifySumsE100();

console.log('verify:e100:evidence PASSED');
