#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { E87_ROOT, E87_LOCK_PATH, ensureDir, minimalLog } from './e87_lib.mjs';
import { writeMd, sha256File } from './e66_lib.mjs';

const update=process.env.UPDATE_E87_EVIDENCE==='1';
const updPol=process.env.UPDATE_E87_POLICIES==='1';
const mode=String(process.env.APPLY_MODE||'APPLY').toUpperCase();
if(process.env.CI==='true'&&(update||updPol||String(process.env.APPLY_MODE||'').trim()!==''||String(process.env.ENABLE_DEMO_ADAPTER||'').trim()!==''||String(process.env.ALLOW_MANUAL_RECON||'').trim()!=='')) throw new Error('UPDATE/APPLY/DEMO forbidden in CI');
if(!['APPLY','PROPOSE'].includes(mode)) throw new Error('APPLY_MODE must be APPLY|PROPOSE');
if(fs.existsSync(E87_LOCK_PATH)&&process.env.CLEAR_E87_LOCK!=='1') throw new Error(`kill-lock active: ${E87_LOCK_PATH}`);
if(process.env.CLEAR_E87_LOCK==='1'&&process.env.CI!=='true') fs.rmSync(E87_LOCK_PATH,{force:true});
if((process.env.ENABLE_DEMO_ADAPTER!=='1'||process.env.ALLOW_MANUAL_RECON!=='1')&&update) throw new Error('ENABLE_DEMO_ADAPTER=1 and ALLOW_MANUAL_RECON=1 required');

function gitStatus(){return (spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout||'').trim();}
function parseMap(text){const m=new Map();for(const row of text.split('\n').map((x)=>x.trim()).filter(Boolean))m.set(row.slice(3).trim(),row.slice(0,2));return m;}
function scopeOk(before,after){const b=parseMap(before),a=parseMap(after),ch=[];for(const [r,s] of a.entries())if(!b.has(r)||b.get(r)!==s)ch.push(r);for(const r of b.keys())if(!a.has(r))ch.push(r);return ch.every((r)=>r.startsWith('reports/evidence/E87/')||r==='core/edge/contracts/e87_mitigation_policy.md'||r==='core/edge/contracts/e87_disablelist_policy.md');}

const before=gitStatus();
const mit=fs.readFileSync(path.join(E87_ROOT,'MITIGATION_COURT.md'),'utf8');
const dis=fs.readFileSync(path.join(E87_ROOT,'DISABLELIST_COURT.md'),'utf8');
const applyObj={mode,mitigation_fingerprint:(mit.match(/mitigation_court_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'',disablelist_fingerprint:(dis.match(/disablelist_court_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||''};
if(update&&updPol&&mode==='APPLY'&&process.env.CI!=='true'){
  const stamp='- applied_by: verify:e87:update';
  if(!fs.readFileSync('core/edge/contracts/e87_mitigation_policy.md','utf8').includes(stamp)) fs.appendFileSync('core/edge/contracts/e87_mitigation_policy.md',`\n${stamp}\n`);
  if(!fs.readFileSync('core/edge/contracts/e87_disablelist_policy.md','utf8').includes(stamp)) fs.appendFileSync('core/edge/contracts/e87_disablelist_policy.md',`\n${stamp}\n`);
}
const hashes={mitigation_policy_hash:sha256File(path.resolve('core/edge/contracts/e87_mitigation_policy.md')),disablelist_policy_hash:sha256File(path.resolve('core/edge/contracts/e87_disablelist_policy.md'))};
const fp=crypto.createHash('sha256').update(JSON.stringify({...applyObj,...hashes})).digest('hex');
if(update&&process.env.CI!=='true'){
  ensureDir(E87_ROOT);
  writeMd(path.join(E87_ROOT,'APPLY_RECEIPT.md'),['# E87 APPLY RECEIPT','- status: PASS',`- mode: ${mode}`,`- mitigation_fingerprint: ${applyObj.mitigation_fingerprint}`,`- disablelist_fingerprint: ${applyObj.disablelist_fingerprint}`,`- mitigation_policy_hash: ${hashes.mitigation_policy_hash}`,`- disablelist_policy_hash: ${hashes.disablelist_policy_hash}`,`- apply_fingerprint: ${fp}`].join('\n'));
}
const after=gitStatus();
if(before!==after){if(process.env.CI==='true') throw new Error('CI_READ_ONLY_VIOLATION'); if(!update) throw new Error('READ_ONLY_VIOLATION'); if(!scopeOk(before,after)) throw new Error('UPDATE_SCOPE_VIOLATION');}
minimalLog(`verify:e87:apply PASSED apply_fingerprint=${fp}`);
