#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { E83_ROOT, E83_POLICY, ensureDir, quietLog, minimalLog } from './e83_lib.mjs';
import { writeMd, sha256File } from './e66_lib.mjs';

const update=process.env.UPDATE_E83_EVIDENCE==='1';
const updateThresholds=process.env.UPDATE_E83_THRESHOLDS==='1';
if(process.env.CI==='true'&&(update||updateThresholds)) throw new Error('UPDATE_E83 flags forbidden in CI');

function scalar(raw,k,d){return Number((raw.match(new RegExp(`- ${k}:\\s*([0-9.]+)`))||[])[1]??d);}
const policyRaw=fs.readFileSync(E83_POLICY,'utf8');
const current={
  MIN_WINDOWS_STRICT:scalar(policyRaw,'MIN_WINDOWS_STRICT',4),
  MAX_INVALID_STRICT:scalar(policyRaw,'MAX_INVALID_STRICT',0.04),
  MAX_SPREAD_P50_STRICT:scalar(policyRaw,'MAX_SPREAD_P50_STRICT',0.1),
  MAX_FEE_AVG_STRICT:scalar(policyRaw,'MAX_FEE_AVG_STRICT',6)
};
const recon=fs.readFileSync(path.join(E83_ROOT,'EXEC_RECON_OBSERVED_MULTI.md'),'utf8');
const rows=[...recon.matchAll(/^\|\s([^|]+)\s\|\s([0-9]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|/gm)].map((m)=>({symbol:m[1].trim(),windows_count:Number(m[2]),invalid:Number(m[3]),drift_proxy:Number(m[4]),spread:Number(m[5]),fee:Number(m[6])}));
if(rows.length===0) throw new Error('missing recon rows');
const demoPath=path.join(E83_ROOT,'EXEC_RECON_DEMO_DAILY.md');
const demoRows=fs.existsSync(demoPath)?[...fs.readFileSync(demoPath,'utf8').matchAll(/^\|\s([^|]+)\s\|\s([0-9]+)\s\|/gm)].length:0;
const proposed={
  MIN_WINDOWS_STRICT:Math.max(current.MIN_WINDOWS_STRICT,Math.min(8,current.MIN_WINDOWS_STRICT+(demoRows>=6?1:0))),
  MAX_INVALID_STRICT:Number(Math.min(current.MAX_INVALID_STRICT,Math.max(...rows.map((r)=>r.invalid))*1.05).toFixed(4)),
  MAX_SPREAD_P50_STRICT:Number(Math.min(current.MAX_SPREAD_P50_STRICT,Math.max(...rows.map((r)=>r.spread))*1.05).toFixed(4)),
  MAX_FEE_AVG_STRICT:Number(Math.min(current.MAX_FEE_AVG_STRICT,Math.max(...rows.map((r)=>r.fee))*1.05).toFixed(4))
};
const reasonCodes=[];
for(const k of Object.keys(current)){
  if(proposed[k]===current[k]) reasonCodes.push(`${k}_UNCHANGED`);
  else if(k.startsWith('MAX_')&&proposed[k]<current[k]) reasonCodes.push(`${k}_TIGHTENED_BY_OBSERVED`);
  else if(k==='MIN_WINDOWS_STRICT'&&proposed[k]>current[k]) reasonCodes.push(`${k}_TIGHTENED_BY_STREAK`);
  else reasonCodes.push(`${k}_RELAXED_JUSTIFIED`);
}
const prevHash=sha256File(E83_POLICY);
const nextHash=update&&updateThresholds?crypto.createHash('sha256').update(JSON.stringify(proposed)).digest('hex'):prevHash;
const fp=crypto.createHash('sha256').update(JSON.stringify({current,proposed,reasonCodes,demoRows})).digest('hex');

if(update&&process.env.CI!=='true'){
  ensureDir(E83_ROOT);
  writeMd(path.join(E83_ROOT,'THRESHOLD_COURT.md'),['# E83 THRESHOLD COURT','- status: PASS',`- previous_threshold_hash: ${prevHash}`,`- new_threshold_hash: ${nextHash}`,`- reason_codes: ${reasonCodes.join(',')}`,`- update_thresholds: ${updateThresholds?'true':'false'}`,`- threshold_court_fingerprint: ${fp}`,'','| key | current | proposed |','|---|---:|---:|',...Object.keys(current).sort().map((k)=>`| ${k} | ${current[k]} | ${proposed[k]} |`)].join('\n'));
  writeMd(path.join(E83_ROOT,'THRESHOLD_DIFF.md'),['# E83 THRESHOLD DIFF',`- previous_threshold_hash: ${prevHash}`,`- new_threshold_hash: ${nextHash}`,'','| key | old | new | delta |','|---|---:|---:|---:|',...Object.keys(current).sort().map((k)=>`| ${k} | ${current[k]} | ${proposed[k]} | ${(proposed[k]-current[k]).toFixed(4)} |`)].join('\n'));
  writeMd(path.join(E83_ROOT,'THRESHOLD_CHANGELOG.md'),['# E83 THRESHOLD CHANGELOG',`- reason_codes: ${reasonCodes.join(',')}`,`- update_thresholds: ${updateThresholds?'true':'false'}`,`- continuity_previous_threshold_hash: ${prevHash}`].join('\n'));
}

if(!update){
  const courtPath=path.join(E83_ROOT,'THRESHOLD_COURT.md');
  if(!fs.existsSync(courtPath)) throw new Error('missing THRESHOLD_COURT.md');
  const continuity=(fs.readFileSync(courtPath,'utf8').match(/new_threshold_hash:\s*([a-f0-9]{64})/)||[])[1]||'';
  if(!continuity) throw new Error('missing threshold continuity hash');
}
quietLog(JSON.stringify({threshold_court_fingerprint:fp,reason_codes:reasonCodes},null,2));
minimalLog(`verify:e83:threshold:court PASSED threshold_court_fingerprint=${fp}`);
