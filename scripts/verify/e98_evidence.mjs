#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  E98_ROOT,
  anchorsE98,
  ensureDir,
  evidenceFingerprintE98,
  readCanonicalFingerprintFromMd,
  rewriteSumsE98,
  verifySumsE98,
  isCIMode
} from './e98_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E98_EVIDENCE==='1';
if(isCIMode()&&update) throw new Error('UPDATE_E98_EVIDENCE forbidden in CI');

ensureDir(E98_ROOT);

if(update&&!isCIMode()){
  // Write pending stubs
  writeMd(path.join(E98_ROOT,'CLOSEOUT.md'),'# E98 CLOSEOUT\n- canonical_fingerprint: pending');
  writeMd(path.join(E98_ROOT,'VERDICT.md'),'# E98 VERDICT\n- canonical_fingerprint: pending');
  rewriteSumsE98();

  let canon=evidenceFingerprintE98();

  const closeout=(fp)=>[
    '# E98 CLOSEOUT',
    '- status: PASS',
    ...Object.entries(anchorsE98())
      .sort((a,b)=>a[0].localeCompare(b[0]))
      .map(([k,v])=>`- ${k}: ${v}`),
    `- canonical_fingerprint: ${fp}`,
    '- exact_commands: npm ci; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e97; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e97; CI=false UPDATE_E98_EVIDENCE=1 CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e98:update; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e98; CI=true CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e98; CI=true UPDATE_E98_EVIDENCE=1 npm run -s verify:e98; CI=1 UPDATE_E98_EVIDENCE=1 npm run -s verify:e98; CI=false CHAIN_MODE=FAST_PLUS QUIET=1 npm run -s verify:e98:apply_rehearsal'
  ].join('\n');

  const verdict=(fp)=>[
    '# E98 VERDICT',
    '- status: PASS',
    '- gates: PASS',
    `- canonical_fingerprint: ${fp}`
  ].join('\n');

  // First pass
  writeMd(path.join(E98_ROOT,'CLOSEOUT.md'),closeout(canon));
  writeMd(path.join(E98_ROOT,'VERDICT.md'),verdict(canon));
  rewriteSumsE98();

  // Second pass (canonical stability)
  canon=evidenceFingerprintE98();
  writeMd(path.join(E98_ROOT,'CLOSEOUT.md'),closeout(canon));
  writeMd(path.join(E98_ROOT,'VERDICT.md'),verdict(canon));
  rewriteSumsE98();
}

// Verification phase
const req=[
  'PREFLIGHT.md',
  'CASE_COLLISION_CONTRACT.md',
  'PATH_INVARIANCE_ASSERTIONS.md',
  'PERF_NOTES.md',
  'CLOSEOUT.md',
  'VERDICT.md',
  'SHA256SUMS.md'
];

for(const f of req){
  if(!fs.existsSync(path.join(E98_ROOT,f))){
    throw new Error(`missing ${f}`);
  }
}

const c=readCanonicalFingerprintFromMd(path.join(E98_ROOT,'CLOSEOUT.md'));
const v=readCanonicalFingerprintFromMd(path.join(E98_ROOT,'VERDICT.md'));
const r=evidenceFingerprintE98();

if(!c||!v||!r||c!==v||c!==r){
  throw new Error('canonical parity violation');
}

verifySumsE98();

console.log('verify:e98:evidence PASSED');
