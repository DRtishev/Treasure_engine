#!/usr/bin/env node
import path from 'node:path';
import { rewriteSums } from './foundation_sums.mjs';
import { E141_ROOT, evidenceFingerprintE141, writeMd } from './e141_lib.mjs';

export function runSeal(){
  const f1=evidenceFingerprintE141(); const f2=evidenceFingerprintE141(); const ok=f1===f2;
  writeMd(path.join(E141_ROOT,'SEAL_X2.md'),['# E141 SEAL X2',`- fp1: ${f1}`,`- fp2: ${f2}`,`- status: ${ok?'PASS':'FAIL'}`,'## RAW',`- parity: ${ok}`].join('\n'));
  rewriteSums(E141_ROOT,['SHA256SUMS.md'],'reports/evidence');
  return {ec:ok?0:1};
}
if(process.argv[1]===new URL(import.meta.url).pathname) process.exit(runSeal().ec);
