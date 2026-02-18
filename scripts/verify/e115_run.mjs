#!/usr/bin/env node
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { E115_ROOT, enforceCIBoundaryE115, isCITruthy, modeE115, snapshotState, writeMdAtomic, cmdOut } from './e115_lib.mjs';

enforceCIBoundaryE115();
const update=process.env.UPDATE_E115_EVIDENCE==='1'; if(update&&isCITruthy()) throw new Error('E115_CI_UPDATE_REJECTED');
const protectedPaths=['.foundation-seal/E115_INPUT_BINDING.json','.foundation-seal/capsules','.foundation-seal/overlay','.foundation-seal/ledger'];
const before=snapshotState(protectedPaths); const beforeGit=spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout;
if(isCITruthy()){ const r=spawnSync('npm',['run','-s','verify:e114'],{stdio:'inherit',env:{...process.env,LANG:'C',LC_ALL:'C',TZ:'UTC'}}); if((r.status??1)!==0) throw new Error('E115_BASELINE_FAIL'); }
if(update&&!isCITruthy()) writeMdAtomic(path.join(E115_ROOT,'PREFLIGHT.md'),['# E115 PREFLIGHT','- pwd: <REPO_ROOT>',`- branch: ${cmdOut('git',['branch','--show-current'])}`,`- head: ${cmdOut('git',['rev-parse','HEAD'])}`,`- node: ${cmdOut('node',['-v'])}`,`- npm: ${cmdOut('npm',['-v'])}`,`- mode: ${modeE115()}`].join('\n'));
try{ const r=spawnSync('node',['scripts/verify/e115_evidence.mjs'],{stdio:'inherit',env:{...process.env,LANG:'C',LC_ALL:'C',TZ:'UTC'}}); if((r.status??1)!==0) throw new Error('E115_EVIDENCE_FAIL'); }
catch(e){ const after=snapshotState(protectedPaths); spawnSync('node',['scripts/verify/e115_zero_writes_on_fail.mjs'],{stdio:'inherit',env:{...process.env,E115_FAILSTATE_BEFORE:before,E115_FAILSTATE_AFTER:after}}); throw e; }
const afterGit=spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout; if(!update&&beforeGit!==afterGit) throw new Error('E115_READ_ONLY_VIOLATION');
console.log('verify:e115 PASSED');
