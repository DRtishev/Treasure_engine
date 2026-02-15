#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { E86_ROOT, E86_LOCK_PATH, E86_THRESHOLD_POLICY, ensureDir, quietLog, minimalLog } from './e86_lib.mjs';
import { writeMd, sha256File } from './e66_lib.mjs';

const update=process.env.UPDATE_E86_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E86_EVIDENCE forbidden in CI');
if(fs.existsSync(E86_LOCK_PATH)&&process.env.CLEAR_E86_LOCK!=='1') throw new Error(`kill-lock active: ${E86_LOCK_PATH}`);
if(process.env.CLEAR_E86_LOCK==='1'&&process.env.CI!=='true') fs.rmSync(E86_LOCK_PATH,{force:true});
function simulate(root){fs.mkdirSync(root,{recursive:true});const policy=fs.readFileSync(E86_THRESHOLD_POLICY,'utf8');const court=fs.readFileSync(path.resolve('reports/evidence/E86/TIGHTENING_COURT.md'),'utf8');fs.writeFileSync(path.join(root,'policy.md'),policy);fs.writeFileSync(path.join(root,'court.md'),court);const policyHash=crypto.createHash('sha256').update(policy).digest('hex');const fp=crypto.createHash('sha256').update(JSON.stringify({policyHash,court,seed:String(process.env.SEED||'12345')})).digest('hex');return {policyHash,fp};}
const r1dir=fs.mkdtempSync(path.join(os.tmpdir(),'e86-run1-'));const r2dir=fs.mkdtempSync(path.join(os.tmpdir(),'e86-run2-'));
const r1=simulate(r1dir),r2=simulate(r2dir);const ok=r1.policyHash===r2.policyHash&&r1.fp===r2.fp;
if(!ok||process.env.FORCE_E86_MISMATCH==='1'){ensureDir(path.dirname(E86_LOCK_PATH));writeMd(E86_LOCK_PATH,['# E86 KILL LOCK','- reason: DETERMINISTIC_MISMATCH',`- run1_policy_hash: ${r1.policyHash}`,`- run2_policy_hash: ${r2.policyHash}`,`- run1_fingerprint: ${r1.fp}`,`- run2_fingerprint: ${r2.fp}`].join('\n'));throw new Error('verify:threshold:apply:x2:e86 FAILED');}
if(update&&process.env.CI!=='true'){ensureDir(E86_ROOT);writeMd(path.join(E86_ROOT,'RUNS_THRESHOLD_APPLY_X2.md'),['# E86 RUNS THRESHOLD APPLY X2','- run1_temp_root: <tmp-run1>','- run2_temp_root: <tmp-run2>',`- run1_policy_hash: ${r1.policyHash}`,`- run2_policy_hash: ${r2.policyHash}`,`- run1_fingerprint: ${r1.fp}`,`- run2_fingerprint: ${r2.fp}`,'- deterministic_match: true'].join('\n'));}
quietLog(JSON.stringify({deterministic_match:true,run_fingerprint:r1.fp},null,2));minimalLog(`verify:threshold:apply:x2:e86 PASSED run_fingerprint=${r1.fp}`);
fs.rmSync(r1dir,{recursive:true,force:true});fs.rmSync(r2dir,{recursive:true,force:true});
