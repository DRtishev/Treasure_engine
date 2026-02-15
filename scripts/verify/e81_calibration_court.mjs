#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { E81_ROOT, E80_CAL, E81_CAL, ensureDir, quietLog, minimalLog } from './e81_lib.mjs';
import { writeMd, sha256File } from './e66_lib.mjs';

const update=process.env.UPDATE_E81_EVIDENCE==='1';
const updateCal=process.env.UPDATE_E81_CALIBRATION==='1';
if(process.env.CI==='true'&&(update||updateCal)) throw new Error('UPDATE_E81 flags forbidden in CI');

function parseCal(file){
  const raw=fs.readFileSync(file,'utf8');
  const map={};
  for(const m of raw.matchAll(/^-\s([a-z0-9_]+):\s*([-+]?[0-9]*\.?[0-9]+)/gmi)) map[m[1]]=Number(m[2]);
  return map;
}
function weightFor(k){if(/drift_budget|strict|baseline/.test(k)) return 2; if(/latency/.test(k)) return 0.5; return 1;}

const prevMap=parseCal(E80_CAL);
const newMap=parseCal(E81_CAL);
const keys=[...new Set([...Object.keys(prevMap),...Object.keys(newMap)])].sort();
let weightedDelta=0,weightedBase=0;
const rows=[];
for(const k of keys){const p=prevMap[k]??0; const n=newMap[k]??0; const w=weightFor(k);const d=Math.abs(n-p);weightedDelta+=w*d; weightedBase+=w*Math.abs(p||1);rows.push({key:k,previous:p,next:n,abs_delta:d,weight:w,weighted_delta:w*d});}
for(const r of rows){
  const norm=Math.max(Math.abs(r.previous),1);
  r.normalized_delta=r.abs_delta/norm;
  r.weighted_normalized_delta=r.normalized_delta*r.weight;
}
weightedDelta=rows.reduce((a,r)=>a+r.weighted_normalized_delta,0);
weightedBase=rows.reduce((a,r)=>a+r.weight,0);
const driftRate=weightedBase===0?0:weightedDelta/weightedBase;
const baselineBudget=newMap.drift_budget_baseline??0.01;
const strictBudget=newMap.drift_budget_strict_1??0.005;
const breakingBudget=(newMap.drift_budget_breaking??(baselineBudget*2));
const strictStatus=driftRate<=strictBudget?'PASS':'FAIL';
const baselineStatus=driftRate<=baselineBudget?'PASS':'FAIL';
const breakingChange=driftRate>breakingBudget;
const reasonCodes=[strictStatus==='FAIL'?'STRICT_BUDGET_EXCEEDED':'STRICT_OK',baselineStatus==='FAIL'?'BASELINE_BUDGET_EXCEEDED':'BASELINE_OK',breakingChange?'BREAKING_CHANGE':'NON_BREAKING'];
const prevHash=sha256File(E80_CAL),newHash=sha256File(E81_CAL);
const fp=crypto.createHash('sha256').update(JSON.stringify({rows,driftRate,baselineBudget,strictBudget,breakingBudget})).digest('hex');

if(update&&process.env.CI!=='true'){
  if(!updateCal) throw new Error('UPDATE_E81_CALIBRATION=1 required');
  ensureDir(E81_ROOT);
  writeMd(path.join(E81_ROOT,'CALIBRATION_COURT.md'),['# E81 CALIBRATION COURT',`- status: ${baselineStatus==='PASS'?'PASS':'FAIL'}`,`- previous_cal_hash: ${prevHash}`,`- new_cal_hash: ${newHash}`,`- drift_rate: ${driftRate.toFixed(8)}`,`- reason_codes: ${reasonCodes.join(',')}`,`- breaking_change: ${breakingChange?'true':'false'}`,`- calibration_delta_fingerprint: ${fp}`,'','| key | value |','|---|---|',`| previous_cal_hash | ${prevHash} |`,`| new_cal_hash | ${newHash} |`,`| drift_rate | ${driftRate.toFixed(8)} |`,`| baseline_budget | ${baselineBudget.toFixed(8)} |`,`| strict_1_budget | ${strictBudget.toFixed(8)} |`,`| strict_1_status | ${strictStatus} |`,`| baseline_status | ${baselineStatus} |`,`| breaking_change | ${breakingChange?'true':'false'} |`].join('\n'));
  writeMd(path.join(E81_ROOT,'CALIBRATION_DIFF.md'),['# E81 CALIBRATION DIFF',`- previous_cal_hash: ${prevHash}`,`- new_cal_hash: ${newHash}`,'','| param | previous | next | abs_delta | normalized_delta | weight | weighted_normalized_delta |','|---|---:|---:|---:|---:|---:|---:|',...rows.map((r)=>`| ${r.key} | ${r.previous.toFixed(8)} | ${r.next.toFixed(8)} | ${r.abs_delta.toFixed(8)} | ${r.normalized_delta.toFixed(8)} | ${r.weight.toFixed(2)} | ${r.weighted_normalized_delta.toFixed(8)} |`)].join('\n'));
  writeMd(path.join(E81_ROOT,'CALIBRATION_CHANGELOG.md'),['# E81 CALIBRATION CHANGELOG',`- previous_cal_hash: ${prevHash}`,`- new_cal_hash: ${newHash}`,`- drift_rate: ${driftRate.toFixed(8)}`,`- reason_codes: ${reasonCodes.join(',')}`,`- breaking_change: ${breakingChange?'true':'false'}`].join('\n'));
}
if(process.env.CI==='true'&&baselineStatus!=='PASS') throw new Error('CALIBRATION_BASELINE_BUDGET_FAIL');
quietLog(JSON.stringify({drift_rate:driftRate,reason_codes:reasonCodes,breaking_change:breakingChange,calibration_delta_fingerprint:fp},null,2));
minimalLog(`verify:e81:calibration:court PASSED calibration_delta_fingerprint=${fp}`);
