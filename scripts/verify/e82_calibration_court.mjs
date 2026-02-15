#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { E82_ROOT, E81_CAL, E82_CAL, ensureDir, quietLog, minimalLog } from './e82_lib.mjs';
import { writeMd, sha256File } from './e66_lib.mjs';

const update=process.env.UPDATE_E82_EVIDENCE==='1';
const updateCal=process.env.UPDATE_E82_CALIBRATION==='1';
if(process.env.CI==='true'&&(update||updateCal)) throw new Error('UPDATE_E82 flags forbidden in CI');

function parseCal(file){const raw=fs.readFileSync(file,'utf8');const map={};for(const m of raw.matchAll(/^-\s([a-z0-9_]+):\s*([-+]?[0-9]*\.?[0-9]+)/gmi)) map[m[1]]=Number(m[2]);return map;}
function weightFor(k){if(/drift_budget|strict|baseline/.test(k)) return 2; if(/latency/.test(k)) return 0.5; return 1;}
const prevHash=sha256File(E81_CAL),newHash=sha256File(E82_CAL);
const e81Court=fs.readFileSync(path.resolve('reports/evidence/E81/CALIBRATION_COURT.md'),'utf8');
const expectedPrev=(e81Court.match(/new_cal_hash:\s*([a-f0-9]{64})/)||[])[1]||'';
if(expectedPrev!==prevHash) throw new Error('CALIBRATION_CHAIN_BREAK');

const prevMap=parseCal(E81_CAL),newMap=parseCal(E82_CAL);
const keys=[...new Set([...Object.keys(prevMap),...Object.keys(newMap)])].sort();
const rows=[];
for(const k of keys){const p=prevMap[k]??0,n=newMap[k]??0,w=weightFor(k),d=Math.abs(n-p),norm=Math.max(Math.abs(p),1);const nd=d/norm;rows.push({key:k,previous:p,next:n,abs_delta:d,weight:w,normalized_delta:nd,weighted_normalized_delta:nd*w});}
const driftRate=rows.reduce((a,r)=>a+r.weighted_normalized_delta,0)/Math.max(rows.reduce((a,r)=>a+r.weight,0),1);
const baselineBudget=newMap.drift_budget_baseline??0.02;
const strictBudget=newMap.drift_budget_strict_1??0.004;
const strictStatus=driftRate<=strictBudget?'PASS':'FAIL';
const baselineStatus=driftRate<=baselineBudget?'PASS':'FAIL';
const reasonCodes=[strictStatus==='PASS'?'STRICT_OK':'STRICT_BUDGET_EXCEEDED',baselineStatus==='PASS'?'BASELINE_OK':'BASELINE_BUDGET_EXCEEDED'];
const fp=crypto.createHash('sha256').update(JSON.stringify({rows,driftRate,baselineBudget,strictBudget})).digest('hex');

if(update&&process.env.CI!=='true'){
  if(!updateCal) throw new Error('UPDATE_E82_CALIBRATION=1 required');
  ensureDir(E82_ROOT);
  writeMd(path.join(E82_ROOT,'CALIBRATION_COURT.md'),['# E82 CALIBRATION COURT',`- status: ${baselineStatus}`,`- previous_cal_hash: ${prevHash}`,`- new_cal_hash: ${newHash}`,`- drift_rate: ${driftRate.toFixed(8)}`,`- reason_codes: ${reasonCodes.join(',')}`,`- calibration_delta_fingerprint: ${fp}`,'','| key | value |','|---|---|',`| previous_cal_hash | ${prevHash} |`,`| new_cal_hash | ${newHash} |`,`| drift_rate | ${driftRate.toFixed(8)} |`,`| baseline_budget | ${baselineBudget.toFixed(8)} |`,`| strict_1_budget | ${strictBudget.toFixed(8)} |`,`| strict_1_status | ${strictStatus} |`,`| baseline_status | ${baselineStatus} |`].join('\n'));
  writeMd(path.join(E82_ROOT,'CALIBRATION_DIFF.md'),['# E82 CALIBRATION DIFF',`- previous_cal_hash: ${prevHash}`,`- new_cal_hash: ${newHash}`,'','| param | previous | next | abs_delta | normalized_delta | weight | weighted_normalized_delta |','|---|---:|---:|---:|---:|---:|---:|',...rows.map((r)=>`| ${r.key} | ${r.previous.toFixed(8)} | ${r.next.toFixed(8)} | ${r.abs_delta.toFixed(8)} | ${r.normalized_delta.toFixed(8)} | ${r.weight.toFixed(2)} | ${r.weighted_normalized_delta.toFixed(8)} |`)].join('\n'));
  writeMd(path.join(E82_ROOT,'CALIBRATION_CHANGELOG.md'),['# E82 CALIBRATION CHANGELOG',`- previous_cal_hash: ${prevHash}`,`- new_cal_hash: ${newHash}`,`- drift_rate: ${driftRate.toFixed(8)}`,`- reason_codes: ${reasonCodes.join(',')}`].join('\n'));
}
if(process.env.CI==='true'&&baselineStatus!=='PASS') throw new Error('CALIBRATION_BASELINE_BUDGET_FAIL');
quietLog(JSON.stringify({drift_rate:driftRate,reason_codes:reasonCodes,calibration_delta_fingerprint:fp},null,2));
minimalLog(`verify:e82:calibration:court PASSED calibration_delta_fingerprint=${fp}`);
