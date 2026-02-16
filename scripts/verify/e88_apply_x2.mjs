#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { E88_ROOT, E88_LOCK_PATH, ensureDir, minimalLog } from './e88_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E88_EVIDENCE==='1';
if(fs.existsSync(E88_LOCK_PATH)&&process.env.CLEAR_E88_KILL_LOCK!=='1') throw new Error(`kill-lock active: ${E88_LOCK_PATH}`);
if(process.env.CLEAR_E88_KILL_LOCK==='1'&&process.env.CI!=='true') fs.rmSync(E88_LOCK_PATH,{force:true});
const court=fs.readFileSync(path.join(E88_ROOT,'PARK_AGING_COURT.md'),'utf8');
const run1=crypto.createHash('sha256').update(JSON.stringify({court,seed:String(process.env.SEED||'12345')})).digest('hex');
const run2=crypto.createHash('sha256').update(JSON.stringify({court,seed:String(process.env.SEED||'12345')})).digest('hex');
if(run1!==run2||process.env.FORCE_E88_MISMATCH==='1'){
  ensureDir(path.dirname(E88_LOCK_PATH));
  writeMd(E88_LOCK_PATH,['# E88 KILL LOCK','- reason: DETERMINISTIC_MISMATCH',`- run1_fingerprint: ${run1}`,`- run2_fingerprint: ${run2}`].join('\n'));
  throw new Error('verify:e88:apply:x2 FAILED');
}
if(update&&process.env.CI!=='true') writeMd(path.join(E88_ROOT,'RUNS_APPLY_X2.md'),['# E88 RUNS APPLY X2',`- run1_fingerprint: ${run1}`,`- run2_fingerprint: ${run2}`,'- deterministic_match: true'].join('\n'));
if(!update&&!fs.existsSync(path.join(E88_ROOT,'RUNS_APPLY_X2.md'))) throw new Error('missing RUNS_APPLY_X2.md');
minimalLog(`verify:e88:apply:x2 PASSED run_fingerprint=${run1}`);
