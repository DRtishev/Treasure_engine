#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { enforceCIBoundaryE118, isCITruthy, modeE118, snapshotState } from './e118_lib.mjs';

enforceCIBoundaryE118();
const update=process.env.UPDATE_E118_EVIDENCE==='1';
if (update && isCITruthy()) throw new Error('E118_CI_UPDATE_REJECTED');
const mode=modeE118();
if (mode==='ONLINE_REQUIRED' && process.env.ENABLE_NET!=='1') throw new Error('E118_ONLINE_REQUIRED_NEEDS_ENABLE_NET');
const protectedPaths=['.foundation-seal/E118_INPUT_BINDING.json','.foundation-seal/runs','.foundation-seal/capsules','.foundation-seal/overlay','.foundation-seal/ledger'];
const before=snapshotState(protectedPaths);
const beforeGit=spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout;
const r=spawnSync('node',['scripts/verify/e118_evidence.mjs'],{stdio:'inherit',env:{...process.env,E118_FAILSTATE_BEFORE:before}});
if ((r.status??1)!==0) process.exit(r.status??1);
const afterGit=spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout;
if (!update && beforeGit!==afterGit) throw new Error('E118_READ_ONLY_VIOLATION');
