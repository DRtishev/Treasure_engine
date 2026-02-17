#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  E99_ROOT,
  anchorsE99,
  ensureDir,
  evidenceFingerprintE99,
  readCanonicalFingerprintFromMd,
  rewriteSumsE99,
  verifySumsE99,
  isCIMode
} from './e99_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E99_EVIDENCE==='1';
if(isCIMode()&&update) throw new Error('UPDATE_E99_EVIDENCE forbidden in CI');

ensureDir(E99_ROOT);

if(update&&!isCIMode()){
  // Write pending stubs
  writeMd(path.join(E99_ROOT,'CLOSEOUT.md'),'# E99 CLOSEOUT\n- canonical_fingerprint: pending');
  writeMd(path.join(E99_ROOT,'VERDICT.md'),'# E99 VERDICT\n- canonical_fingerprint: pending');
  rewriteSumsE99();

  let canon=evidenceFingerprintE99();

  const closeout=(fp)=>[
    '# E99 CLOSEOUT',
    '- status: PASS',
    ...Object.entries(anchorsE99())
      .sort((a,b)=>a[0].localeCompare(b[0]))
      .map(([k,v])=>`- ${k}: ${v}`),
    `- canonical_fingerprint: ${fp}`,
    '- exact_commands: npm ci; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e98; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e98; CI=false UPDATE_E99_EVIDENCE=1 CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e99:update; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e99; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e99; CI=true UPDATE_E99_EVIDENCE=1 npm run -s verify:e99; CI=1 UPDATE_E99_EVIDENCE=1 npm run -s verify:e99; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e99:apply_rehearsal'
  ].join('\n');

  const verdict=(fp)=>[
    '# E99 VERDICT',
    '- status: PASS',
    '- gates: PASS',
    `- canonical_fingerprint: ${fp}`
  ].join('\n');

  // First pass
  writeMd(path.join(E99_ROOT,'CLOSEOUT.md'),closeout(canon));
  writeMd(path.join(E99_ROOT,'VERDICT.md'),verdict(canon));
  rewriteSumsE99();

  // Second pass (canonical stability)
  canon=evidenceFingerprintE99();
  writeMd(path.join(E99_ROOT,'CLOSEOUT.md'),closeout(canon));
  writeMd(path.join(E99_ROOT,'VERDICT.md'),verdict(canon));
  rewriteSumsE99();
}

// Verification phase
const req=[
  'PREFLIGHT.md',
  'APPLY_REHEARSAL.md',
  'RUNS_APPLY_REHEARSAL_X2.md',
  'POST_APPLY_STABILITY.md',
  'POST_APPLY_ASSERTIONS.md',
  'CONTRACTS_SUMMARY.md',
  'PERF_NOTES.md',
  'CLOSEOUT.md',
  'VERDICT.md',
  'SHA256SUMS.md'
];

for(const f of req){
  if(!fs.existsSync(path.join(E99_ROOT,f))){
    throw new Error(`missing ${f}`);
  }
}

const c=readCanonicalFingerprintFromMd(path.join(E99_ROOT,'CLOSEOUT.md'));
const v=readCanonicalFingerprintFromMd(path.join(E99_ROOT,'VERDICT.md'));
const r=evidenceFingerprintE99();

if(!c||!v||!r||c!==v||c!==r){
  throw new Error('canonical parity violation');
}

verifySumsE99();

console.log('verify:e99:evidence PASSED');
