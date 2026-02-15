#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeMd } from './e66_lib.mjs';
import { E78_ROOT, E78_LOCK_PATH, ensureDir, defaultNormalizedEnv } from './e78_lib.mjs';
import { runE77CanaryEval } from '../edge/e77_canary_eval.mjs';
import crypto from 'node:crypto';

const update=process.env.UPDATE_E78_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E78_EVIDENCE forbidden when CI=true');
for(const k of Object.keys(process.env)) if((k.startsWith('UPDATE_')||k.startsWith('APPROVE_'))&&process.env.CI==='true'&&String(process.env[k]||'').trim()!=='') throw new Error(`${k} forbidden when CI=true`);
if(fs.existsSync(E78_LOCK_PATH)&&process.env.CLEAR_E78_LOCK!=='1') throw new Error(`kill-lock active: ${E78_LOCK_PATH}`);
if(process.env.CLEAR_E78_LOCK==='1'&&process.env.CI!=='true') fs.rmSync(E78_LOCK_PATH,{force:true});

function once(label,seed,stage){const temp=fs.mkdtempSync(path.join(os.tmpdir(),`e78-canary-${label}-`));const r=runE77CanaryEval({seed});const fp=crypto.createHash('sha256').update(JSON.stringify({stage,seed,recon:r.recon_fingerprint,cal:r.calibration_hash,rows:r.rows})).digest('hex');return{status:0,temp,fp};}
const stage=String(process.env.CANARY_STAGE||'BASELINE').toUpperCase();
const base=Number(process.env.SEED||defaultNormalizedEnv().SEED||'12345');
const s1=Number(process.env.E78_RUN1_SEED||base), s2=Number(process.env.E78_RUN2_SEED||(process.env.FORCE_E78_MISMATCH==='1'?base+71:base));
const r1=once('run1',s1,stage), r2=once('run2',s2,stage);
const det=r1.status===0&&r2.status===0&&r1.fp===r2.fp;
if(!det){ensureDir(path.dirname(E78_LOCK_PATH));writeMd(E78_LOCK_PATH,['# E78 KILL LOCK',`- reason: DETERMINISTIC_MISMATCH`,`- timestamp_utc: ${new Date(Number(defaultNormalizedEnv().SOURCE_DATE_EPOCH)*1000).toISOString()}`,`- run1_fingerprint: ${r1.fp||'N/A'}`,`- run2_fingerprint: ${r2.fp||'N/A'}`,`- run1_seed: ${s1}`,`- run2_seed: ${s2}`,`- run1_root: ${r1.temp}`,`- run2_root: ${r2.temp}`].join('\n')); throw new Error('verify:edge:canary:x2:e78 FAILED');}
if(update&&process.env.CI!=='true'){ensureDir(E78_ROOT);writeMd(path.join(E78_ROOT,'RUNS_EDGE_CANARY_X2.md'),['# E78 RUNS EDGE CANARY X2',`- canary_stage: ${stage}`,`- run1_seed: ${s1}`,`- run2_seed: ${s2}`,`- run1_fingerprint: ${r1.fp}`,`- run2_fingerprint: ${r2.fp}`,`- deterministic_match: ${String(det)}`,'- run1_root: <tmp-run1>','- run2_root: <tmp-run2>'].join('\n'));}
else if(!fs.existsSync(path.join(E78_ROOT,'RUNS_EDGE_CANARY_X2.md'))) throw new Error('missing RUNS_EDGE_CANARY_X2.md');
console.log(`verify:edge:canary:x2:e78 run1=${r1.temp} run2=${r2.temp}`);console.log(`verify:edge:canary:x2:e78 PASSED run_fingerprint=${r1.fp}`);
