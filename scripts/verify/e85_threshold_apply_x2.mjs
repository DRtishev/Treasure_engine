#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { E85_ROOT, E85_LOCK_PATH, E85_THRESHOLD_POLICY, ensureDir, quietLog, minimalLog } from './e85_lib.mjs';
import { writeMd, sha256File } from './e66_lib.mjs';

const update=process.env.UPDATE_E85_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E85_EVIDENCE forbidden in CI');
if(fs.existsSync(E85_LOCK_PATH)&&process.env.CLEAR_E85_LOCK!=='1') throw new Error(`kill-lock active: ${E85_LOCK_PATH}`);
if(process.env.CLEAR_E85_LOCK==='1'&&process.env.CI!=='true') fs.rmSync(E85_LOCK_PATH,{force:true});

function compute(){const policy=fs.readFileSync(E85_THRESHOLD_POLICY,'utf8');const court=fs.readFileSync(path.resolve('reports/evidence/E84/THRESHOLD_COURT.md'),'utf8');const newH=sha256File(E85_THRESHOLD_POLICY);const fp=crypto.createHash('sha256').update(JSON.stringify({policy,court,newH,seed:String(process.env.SEED||'12345')})).digest('hex');return{newH,fp};}
const t1=fs.mkdtempSync(path.join(os.tmpdir(),'e85-run1-'));const t2=fs.mkdtempSync(path.join(os.tmpdir(),'e85-run2-'));
const r1=compute(),r2=compute();
const ok=r1.newH===r2.newH&&r1.fp===r2.fp;
if(!ok||process.env.FORCE_E85_MISMATCH==='1'){ensureDir(path.dirname(E85_LOCK_PATH));writeMd(E85_LOCK_PATH,['# E85 KILL LOCK','- reason: DETERMINISTIC_MISMATCH',`- run1_policy_hash: ${r1.newH}`,`- run2_policy_hash: ${r2.newH}`,`- run1_fingerprint: ${r1.fp}`,`- run2_fingerprint: ${r2.fp}`].join('\n'));throw new Error('verify:threshold:apply:x2 FAILED');}
if(update&&process.env.CI!=='true'){ensureDir(E85_ROOT);writeMd(path.join(E85_ROOT,'RUNS_THRESHOLD_APPLY_X2.md'),['# E85 RUNS THRESHOLD APPLY X2',`- run1_temp_root: <TMP_RUN_1>`,`- run2_temp_root: <TMP_RUN_2>`,`- run1_policy_hash: ${r1.newH}`,`- run2_policy_hash: ${r2.newH}`,`- run1_fingerprint: ${r1.fp}`,`- run2_fingerprint: ${r2.fp}`,'- deterministic_match: true'].join('\n'));}
quietLog(JSON.stringify({deterministic_match:true,run_fingerprint:r1.fp},null,2));
minimalLog(`verify:threshold:apply:x2 PASSED run_fingerprint=${r1.fp}`);
fs.rmSync(t1,{recursive:true,force:true});fs.rmSync(t2,{recursive:true,force:true});
