#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { enforceCIBoundaryE128, isCITruthy, snapshotState, writeMdAtomic } from './e128_lib.mjs';

enforceCIBoundaryE128();
const update=process.env.UPDATE_E128_EVIDENCE==='1';
if(update&&isCITruthy()) throw new Error('E128_CI_UPDATE_REJECTED');
const protectedPaths=['.foundation-seal/E128_INPUT_BINDING.json','.foundation-seal/runs','.foundation-seal/capsules','.foundation-seal/overlay','.foundation-seal/ledger'];
const before=snapshotState(protectedPaths);
const gitBefore=spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout;
const res=spawnSync('node',['scripts/verify/e128_evidence.mjs'],{stdio:'inherit',env:{...process.env}});
if((res.status??1)!==0){
  const after=snapshotState(protectedPaths);
  writeMdAtomic('reports/evidence/E128/ZERO_WRITES_ON_FAIL.md',['# E128 ZERO WRITES ON FAIL',`- status: ${before===after?'PASS':'FAIL'}`,'- reason: orchestrator_fail_path',`- state_before: ${before}`,`- state_after: ${after}`].join('\n'));
  process.exit(res.status??1);
}
const gitAfter=spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout;
if(!update&&gitBefore!==gitAfter) throw new Error('E128_READ_ONLY_VIOLATION');
