#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { E87_ROOT, E87_LOCK_PATH, ensureDir, minimalLog } from './e87_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E87_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E87_EVIDENCE forbidden in CI');
if(fs.existsSync(E87_LOCK_PATH)&&process.env.CLEAR_E87_LOCK!=='1') throw new Error(`kill-lock active: ${E87_LOCK_PATH}`);
if(process.env.CLEAR_E87_LOCK==='1'&&process.env.CI!=='true') fs.rmSync(E87_LOCK_PATH,{force:true});
function once(temp){
  fs.mkdirSync(temp,{recursive:true});
  const apply=fs.readFileSync(path.resolve('reports/evidence/E87/APPLY_RECEIPT.md'),'utf8');
  const mit=fs.readFileSync(path.resolve('reports/evidence/E87/MITIGATION_COURT.md'),'utf8');
  fs.writeFileSync(path.join(temp,'apply.md'),apply);fs.writeFileSync(path.join(temp,'mit.md'),mit);
  const fp=crypto.createHash('sha256').update(JSON.stringify({apply,mit,seed:String(process.env.SEED||'12345')})).digest('hex');
  return fp;
}
const d1=fs.mkdtempSync(path.join(os.tmpdir(),'e87-apply1-'));const d2=fs.mkdtempSync(path.join(os.tmpdir(),'e87-apply2-'));
const f1=once(d1),f2=once(d2);const ok=f1===f2;
if(!ok||process.env.FORCE_E87_MISMATCH==='1'){
  ensureDir(path.dirname(E87_LOCK_PATH));
  writeMd(E87_LOCK_PATH,['# E87 KILL LOCK','- reason: DETERMINISTIC_MISMATCH',`- run1_fingerprint: ${f1}`,`- run2_fingerprint: ${f2}`].join('\n'));
  throw new Error('verify:e87:apply:x2 FAILED');
}
if(update&&process.env.CI!=='true'){
  ensureDir(E87_ROOT);
  writeMd(path.join(E87_ROOT,'RUNS_APPLY_X2.md'),['# E87 RUNS APPLY X2',`- run1_fingerprint: ${f1}`,`- run2_fingerprint: ${f2}`,'- deterministic_match: true'].join('\n'));
}
minimalLog(`verify:e87:apply:x2 PASSED run_fingerprint=${f1}`);
fs.rmSync(d1,{recursive:true,force:true});fs.rmSync(d2,{recursive:true,force:true});
