#!/usr/bin/env node
import { spawnSync } from 'node:child_process'; import { enforceCIBoundaryE124, isCITruthy, snapshotState, writeMdAtomic } from './e124_lib.mjs';
enforceCIBoundaryE124(); const update=process.env.UPDATE_E124_EVIDENCE==='1'; if(update&&isCITruthy()) throw new Error('E124_CI_UPDATE_REJECTED');
const pp=['.foundation-seal/E124_INPUT_BINDING.json','.foundation-seal/runs','.foundation-seal/capsules','.foundation-seal/overlay','.foundation-seal/ledger']; const b=snapshotState(pp); const bg=spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout;
const r=spawnSync('node',['scripts/verify/e124_evidence.mjs'],{stdio:'inherit',env:{...process.env}});
if((r.status??1)!==0){const a=snapshotState(pp); const ok=b===a; writeMdAtomic('reports/evidence/E124/ZERO_WRITES_ON_FAIL.md',['# E124 ZERO WRITES ON FAIL',`- status: ${ok?'PASS':'FAIL'}`,'- reason: orchestrator_fail_path',`- state_before: ${b}`,`- state_after: ${a}`,'- fallback_ratio: 1.0000','- freshness_ok: false'].join('\n')); process.exit(r.status??1);} const ag=spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout; if(!update&&bg!==ag) throw new Error('E124_READ_ONLY_VIOLATION');
