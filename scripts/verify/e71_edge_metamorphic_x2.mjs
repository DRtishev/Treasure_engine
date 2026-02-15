#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runEdgeMetaSuiteV1 } from '../../core/edge/alpha/edge_magic_meta_suite_v1.mjs';
import { E71_ROOT, E71_LOCK_PATH, ensureDir, defaultNormalizedEnv } from './e71_lib.mjs';
import { stableJson, sha256Text, writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E71_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E71_EVIDENCE=1 forbidden when CI=true');
for(const k of Object.keys(process.env)){ if((k.startsWith('UPDATE_')||k.startsWith('APPROVE_'))&&process.env.CI==='true'&&String(process.env[k]||'').trim()!=='') throw new Error(`${k} forbidden when CI=true`); }

function runOnce(label,seed){
  const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),`e71-${label}-`));
  try{ const rep=runEdgeMetaSuiteV1({seed}); const fp=sha256Text(stableJson(rep)); return {status:0,tempRoot,report:rep,runFingerprint:fp,seed}; }
  catch(e){ return {status:1,tempRoot,report:null,runFingerprint:'',seed,error:String(e?.message||e)}; }
}

const baseSeed=Number(process.env.SEED||'12345');
const run1Seed=Number(process.env.E71_RUN1_SEED||baseSeed);
const run2Seed=Number(process.env.E71_RUN2_SEED||(process.env.FORCE_E71_MISMATCH==='1'?baseSeed+31:baseSeed));
const run1=runOnce('run1',run1Seed); const run2=runOnce('run2',run2Seed);
const deterministicMatch=run1.status===0&&run2.status===0&&run1.runFingerprint===run2.runFingerprint;
const pass=run1.status===0&&run2.status===0&&deterministicMatch;
const doubleFail=run1.status!==0&&run2.status!==0;
const mismatch=run1.status===0&&run2.status===0&&run1.runFingerprint!==run2.runFingerprint;
if(!pass&&(doubleFail||mismatch)){
  ensureDir(path.dirname(E71_LOCK_PATH));
  writeMd(E71_LOCK_PATH,[
    '# E71 KILL LOCK','',`- reason: ${doubleFail?'verify:edge:meta:x2 failed twice':'deterministic mismatch across run1/run2'}`,
    `- timestamp_utc: ${new Date(Number(defaultNormalizedEnv().SOURCE_DATE_EPOCH)*1000).toISOString()}`,
    `- run1_status: ${run1.status}`,`- run2_status: ${run2.status}`,
    `- run1_fingerprint: ${run1.runFingerprint||'N/A'}`,`- run2_fingerprint: ${run2.runFingerprint||'N/A'}`,
    `- run1_seed: ${run1Seed}`,`- run2_seed: ${run2Seed}`,
    `- run1_temp: ${run1.tempRoot}`,`- run2_temp: ${run2.tempRoot}`
  ].join('\n'));
}
if(pass&&fs.existsSync(E71_LOCK_PATH)&&process.env.CI!=='true') fs.rmSync(E71_LOCK_PATH,{force:true});

if(update&&process.env.CI!=='true'){
  ensureDir(E71_ROOT);
  writeMd(path.join(E71_ROOT,'RUNS_EDGE_META_X2.md'),[
    '# E71 RUNS EDGE META X2',`- run1_status: ${run1.status}`,`- run2_status: ${run2.status}`,
    `- run1_seed: ${run1Seed}`,`- run2_seed: ${run2Seed}`,
    `- run1_fingerprint: ${run1.runFingerprint||'N/A'}`,`- run2_fingerprint: ${run2.runFingerprint||'N/A'}`,
    `- deterministic_match: ${String(deterministicMatch)}`,
    '- run1_root: <tmp-run1>','- run2_root: <tmp-run2>'
  ].join('\n'));
}
if(!pass){ console.error('verify:edge:meta:x2 FAILED'); process.exit(1); }
console.log(`verify:edge:meta:x2 temp_roots run1=${run1.tempRoot} run2=${run2.tempRoot}`);
console.log(`verify:edge:meta:x2 PASSED run_fingerprint=${run1.runFingerprint}`);
