#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { E85_ROOT, E85_THRESHOLD_POLICY, ensureDir, quietLog, minimalLog } from './e85_lib.mjs';
import { writeMd, sha256File } from './e66_lib.mjs';

const update=process.env.UPDATE_E85_EVIDENCE==='1';
const updateThresholds=process.env.UPDATE_E85_THRESHOLDS==='1';
const mode=String(process.env.APPLY_MODE||'APPLY').toUpperCase();
if(process.env.CI==='true'&&(update||updateThresholds||String(process.env.APPLY_MODE||'').trim()!=='')) throw new Error('UPDATE/APPLY flags forbidden in CI');
if(!['PROPOSE','APPLY'].includes(mode)) throw new Error('APPLY_MODE must be PROPOSE|APPLY');
function gitStatus(){return (spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout||'').trim();}
function parseMap(text){const m=new Map();for(const row of text.split('\n').map((x)=>x.trim()).filter(Boolean))m.set(row.slice(3).trim(),row.slice(0,2));return m;}
function scopeOk(before,after){const b=parseMap(before),a=parseMap(after),ch=[];for(const [r,s] of a.entries())if(!b.has(r)||b.get(r)!==s)ch.push(r);for(const r of b.keys())if(!a.has(r))ch.push(r);return ch.every((r)=>r.startsWith('reports/evidence/E85/')||r.includes('core/edge/contracts/e85_threshold_policy.md'));}
function scalar(raw,k,d){return Number((raw.match(new RegExp(`\| ${k} \| [^|]+ \| ([0-9.]+) \|`))||[])[1]??d);}

const before=gitStatus();
const court=fs.readFileSync(path.resolve('reports/evidence/E84/THRESHOLD_COURT.md'),'utf8');
const proposed={MIN_WINDOWS_STRICT:scalar(court,'MIN_WINDOWS_STRICT',4),MAX_INVALID_STRICT:scalar(court,'MAX_INVALID_STRICT',0.04),MAX_SPREAD_P50_STRICT:scalar(court,'MAX_SPREAD_P50_STRICT',0.095),MAX_FEE_AVG_STRICT:scalar(court,'MAX_FEE_AVG_STRICT',6)};
const oldHash=sha256File(E85_THRESHOLD_POLICY);
if(update&&updateThresholds&&mode==='APPLY'&&process.env.CI!=='true'){
  const lines=['# E85 Threshold Policy','',`- source_policy: core/edge/contracts/e84_canary_stage_policy.md`,`- MIN_WINDOWS_STRICT: ${proposed.MIN_WINDOWS_STRICT}`,`- MAX_INVALID_STRICT: ${proposed.MAX_INVALID_STRICT.toFixed(4)}`,`- MAX_SPREAD_P50_STRICT: ${proposed.MAX_SPREAD_P50_STRICT.toFixed(4)}`,`- MAX_FEE_AVG_STRICT: ${proposed.MAX_FEE_AVG_STRICT.toFixed(4)}`];
  fs.writeFileSync(E85_THRESHOLD_POLICY,`${lines.join('\n')}\n`,'utf8');
}
const newHash=sha256File(E85_THRESHOLD_POLICY);
const fp=crypto.createHash('sha256').update(JSON.stringify({mode,proposed,oldHash,newHash})).digest('hex');
if(update&&process.env.CI!=='true'){
  ensureDir(E85_ROOT);
  writeMd(path.join(E85_ROOT,'THRESHOLD_APPLY.md'),['# E85 THRESHOLD APPLY','- status: PASS',`- apply_mode: ${mode}`,`- old_policy_hash: ${oldHash}`,`- new_policy_hash: ${newHash}`,`- apply_fingerprint: ${fp}`,'','| key | proposed |','|---|---:|',...Object.keys(proposed).sort().map((k)=>`| ${k} | ${proposed[k]} |`)].join('\n'));
  writeMd(path.join(E85_ROOT,'THRESHOLD_APPLY_DIFF.md'),['# E85 THRESHOLD APPLY DIFF',`- old_policy_hash: ${oldHash}`,`- new_policy_hash: ${newHash}`,'','| key | old_hash | new_hash |','|---|---|---|',`| policy_file | ${oldHash} | ${newHash} |`].join('\n'));
  writeMd(path.join(E85_ROOT,'THRESHOLD_APPLY_CHANGELOG.md'),['# E85 THRESHOLD APPLY CHANGELOG',`- continuity_from_court: ${(court.match(/new_threshold_hash:\s*([a-f0-9]{64})/)||[])[1]||''}`,`- apply_mode: ${mode}`,`- apply_fingerprint: ${fp}`].join('\n'));
  writeMd(path.join(E85_ROOT,'APPLY_RECEIPT.md'),['# E85 APPLY RECEIPT','- cmd: node scripts/verify/e85_threshold_apply.mjs','- utc: 1970-01-01T00:00:00Z','- mode: '+mode,`- resulting_policy_hash: ${newHash}`,`- apply_fingerprint: ${fp}`].join('\n'));
}
const after=gitStatus();
if(before!==after){if(process.env.CI==='true') throw new Error('CI_READ_ONLY_VIOLATION'); if(!update) throw new Error('READ_ONLY_VIOLATION'); if(!scopeOk(before,after)) throw new Error('UPDATE_SCOPE_VIOLATION');}
quietLog(JSON.stringify({old_policy_hash:oldHash,new_policy_hash:newHash,apply_fingerprint:fp},null,2));
minimalLog(`verify:threshold:apply PASSED apply_fingerprint=${fp}`);
