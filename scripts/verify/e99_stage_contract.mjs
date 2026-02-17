#!/usr/bin/env node
// E99-4: Stage contract - verify update-mode completeness
import fs from 'node:fs';
import path from 'node:path';
import { isCIMode } from './e99_lib.mjs';

const update=process.env.UPDATE_E99_EVIDENCE==='1';

// Only run this check in update mode
if(!update){
  console.log('e99:stage_contract SKIP (not in update mode)');
  process.exit(0);
}

if(isCIMode()){
  console.error('e99:stage_contract FAIL: UPDATE_E99_EVIDENCE forbidden in CI');
  process.exit(1);
}

const E99_ROOT='reports/evidence/E99';
const required=[
  'PREFLIGHT.md',
  'APPLY_REHEARSAL.md',
  'RUNS_APPLY_REHEARSAL_X2.md',
  'PRE_APPLY_E97_SNAPSHOT.md',
  'POST_APPLY_E97_SNAPSHOT.md',
  'POST_APPLY_STABILITY.md',
  'POST_APPLY_ASSERTIONS.md',
  'CONTRACTS_SUMMARY.md',
  'PERF_NOTES.md',
  'CLOSEOUT.md',
  'VERDICT.md',
  'SHA256SUMS.md'
];

const missing=[];
for(const f of required){
  if(!fs.existsSync(path.join(E99_ROOT,f))){
    missing.push(f);
  }
}

if(missing.length>0){
  console.error(`e99:stage_contract FAIL: missing ${missing.length} required files`);
  for(const f of missing){
    console.error(`  - ${f}`);
  }
  process.exit(1);
}

console.log('e99:stage_contract PASSED');
