#!/usr/bin/env node
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { E114_ROOT, enforceCIBoundaryE114, isCITruthy, modeE114, snapshotState, writeMdAtomic, cmdOut } from './e114_lib.mjs';

enforceCIBoundaryE114();
const update=process.env.UPDATE_E114_EVIDENCE==='1'; if(update&&isCITruthy()) throw new Error('E114_CI_UPDATE_REJECTED');
const protectedPaths=['.foundation-seal/capsules','.foundation-seal/overlay','.foundation-seal/ledger']; const before=snapshotState(protectedPaths); const beforeGit=spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout;
if(isCITruthy()){ const r=spawnSync('npm',['run','-s','verify:e113'],{stdio:'inherit',env:{...process.env,LANG:'C',LC_ALL:'C',TZ:'UTC'}}); if((r.status??1)!==0) throw new Error('E114_BASELINE_FAIL'); }
if(update&&!isCITruthy()) writeMdAtomic(path.join(E114_ROOT,'PREFLIGHT.md'),['# E114 PREFLIGHT','- pwd: <REPO_ROOT>',`- branch: ${cmdOut('git',['branch','--show-current'])}`,`- head: ${cmdOut('git',['rev-parse','HEAD'])}`,`- node: ${cmdOut('node',['-v'])}`,`- npm: ${cmdOut('npm',['-v'])}`,`- mode: ${modeE114()}`].join('\n'));
try{ const r=spawnSync('node',['scripts/verify/e114_evidence.mjs'],{stdio:'inherit',env:{...process.env,LANG:'C',LC_ALL:'C',TZ:'UTC'}}); if((r.status??1)!==0) throw new Error('E114_EVIDENCE_FAIL'); }
catch(e){ const after=snapshotState(protectedPaths); spawnSync('node',['scripts/verify/e114_zero_writes_on_fail.mjs'],{stdio:'inherit',env:{...process.env,E114_FAILSTATE_BEFORE:before,E114_FAILSTATE_AFTER:after}}); throw e; }
const afterGit=spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout; if(!update&&beforeGit!==afterGit) throw new Error('E114_READ_ONLY_VIOLATION');
console.log('verify:e114 PASSED');
