#!/usr/bin/env node
// E100-5: Stage contract - verify update-mode completeness
import fs from 'node:fs';
import path from 'node:path';
import { isCIMode } from './e100_lib.mjs';

const update=process.env.UPDATE_E100_EVIDENCE==='1';

if(!update){
  console.log('e100:stage_contract SKIP (not in update mode)');
  process.exit(0);
}

if(isCIMode()){
  console.error('e100:stage_contract FAIL: UPDATE_E100_EVIDENCE forbidden in CI');
  process.exit(1);
}

const E100_ROOT='reports/evidence/E100';
const required=[
  'PREFLIGHT.md',
  'APPLY_TXN.md',
  'RUNS_APPLY_TXN_X2.md',
  'ROLLBACK_TXN.md',
  'RUNS_ROLLBACK_X2.md',
  'BUNDLE_HASH.md',
  'CONTRACTS_SUMMARY.md',
  'PERF_NOTES.md',
  'CLOSEOUT.md',
  'VERDICT.md',
  'SHA256SUMS.md'
];

const missing=[];
for(const f of required){
  if(!fs.existsSync(path.join(E100_ROOT,f))){
    missing.push(f);
  }
}

if(missing.length>0){
  console.error(`e100:stage_contract FAIL: missing ${missing.length} required files`);
  for(const f of missing){
    console.error(`  - ${f}`);
  }
  process.exit(1);
}

console.log('e100:stage_contract PASSED');
