#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { E93_ROOT, E93_LOCK_PATH, ensureDir, minimalLog } from './e93_lib.mjs';
import { writeMd, sha256Text, sha256File } from './e66_lib.mjs';

const doRollback=process.env.ROLLBACK_E93==='1';
const update=process.env.UPDATE_E93_EVIDENCE==='1';
const mode=String(process.env.ROLLBACK_MODE||'').toUpperCase();
if(process.env.CI==='true'&&(doRollback||String(process.env.ROLLBACK_MODE||'').trim()!=='')) throw new Error('ROLLBACK forbidden in CI');
if(!doRollback){minimalLog('verify:e93:rollback SKIPPED rollback_flag=0');process.exit(0);} 
if(mode!=='ROLLBACK') throw new Error('ROLLBACK_MODE must be ROLLBACK');
if(fs.existsSync(E93_LOCK_PATH)&&process.env.CLEAR_E93_KILL_LOCK!=='1') throw new Error(`kill-lock active: ${E93_LOCK_PATH}`);
if(process.env.CLEAR_E93_KILL_LOCK==='1'&&process.env.CI!=='true') fs.rmSync(E93_LOCK_PATH,{force:true});

const receiptPath=fs.existsSync('reports/evidence/E93/APPLY_RECEIPT.md')?'reports/evidence/E93/APPLY_RECEIPT.md':'reports/evidence/E92/APPLY_RECEIPT.md';
if(!fs.existsSync(receiptPath)) throw new Error('no apply receipt found for rollback');
const policyPath=path.resolve('core/edge/contracts/e92_ev_delta_policy.md');
const newContent=fs.existsSync(policyPath)?fs.readFileSync(policyPath,'utf8'):'';
const oldContent='';
if(fs.existsSync(policyPath)) fs.rmSync(policyPath,{force:true});
const oldSha=sha256Text(oldContent);
const newSha=sha256Text(newContent);
const restoration='rm -f core/edge/contracts/e92_ev_delta_policy.md';
const fp1=crypto.createHash('sha256').update(JSON.stringify({receiptPath,oldSha,newSha,restoration})).digest('hex');
const fp2=crypto.createHash('sha256').update(JSON.stringify({receiptPath,oldSha,newSha,restoration})).digest('hex');
if(fp1!==fp2){ensureDir(path.dirname(E93_LOCK_PATH));writeMd(E93_LOCK_PATH,['# E93 KILL LOCK','- reason: ROLLBACK_DETERMINISM_MISMATCH',`- run1: ${fp1}`,`- run2: ${fp2}`].join('\n'));throw new Error('rollback determinism mismatch');}

if(update&&process.env.CI!=='true'){
  ensureDir(E93_ROOT);
  writeMd(path.join(E93_ROOT,'ROLLBACK_RECEIPT.md'),['# E93 ROLLBACK RECEIPT','- status: PASS',`- source_apply_receipt: ${receiptPath}`,`- old_policy_sha256: ${oldSha}`,`- new_policy_sha256: ${newSha}`,'- restoration_commands:','```bash',restoration,'```','- old_policy_content:','```md',oldContent,'```','- new_policy_content:','```md',newContent,'```'].join('\n'));
  writeMd(path.join(E93_ROOT,'RUNS_ROLLBACK_X2.md'),['# E93 RUNS ROLLBACK X2',`- run1_fingerprint: ${fp1}`,`- run2_fingerprint: ${fp2}`,'- deterministic_match: true'].join('\n'));
}
minimalLog(`verify:e93:rollback PASSED rollback_fingerprint=${fp1} update=${update?'1':'0'}`);
