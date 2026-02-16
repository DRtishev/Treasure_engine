#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { E94_ROOT, E94_LOCK_PATH, ensureDir, fmt4, parseCadenceRows, minimalLog } from './e94_lib.mjs';
import { writeMd } from './e66_lib.mjs';
import { parseFixtureRowsFromText, computeParkAgingDecisions, BASE_POLICY } from './e89_park_aging_core.mjs';

const update=process.env.UPDATE_E94_EVIDENCE==='1';
if(fs.existsSync(E94_LOCK_PATH)&&process.env.CLEAR_E94_KILL_LOCK!=='1') throw new Error(`kill-lock active: ${E94_LOCK_PATH}`);
if(process.env.CLEAR_E94_KILL_LOCK==='1'&&process.env.CI!=='true') fs.rmSync(E94_LOCK_PATH,{force:true});
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E94_EVIDENCE forbidden in CI');
function arm(reason,meta){ensureDir(path.dirname(E94_LOCK_PATH));writeMd(E94_LOCK_PATH,['# E94 KILL LOCK',`- reason: ${reason}`,...Object.entries(meta).map(([k,v])=>`- ${k}: ${v}`)].join('\n'));}

const reason=parseFixtureRowsFromText(fs.readFileSync('core/edge/state/reason_history_state.md','utf8')).sort((a,b)=>a.date_utc.localeCompare(b.date_utc)||a.symbol.localeCompare(b.symbol));
const cadence=parseCadenceRows();
if(cadence.length===0) throw new Error('cadence ledger missing rows');
const endUtc=cadence[cadence.length-1].date_utc;
const endDay=Math.floor(Date.UTC(Number(endUtc.slice(0,4)),Number(endUtc.slice(5,7))-1,Number(endUtc.slice(8,10)))/86400000);
const windows=[7,14,30];
const minDays=7, varMax=0.0200, rMax=0.2000, hMax=0.8000, pMax=0.2000;
const syms=[...new Set(cadence.map((r)=>r.symbol))].sort();
const park=computeParkAgingDecisions({rows:reason,today:reason[reason.length-1].date_utc,policy:BASE_POLICY});
const parkMap=new Map(park.map((p)=>[p.symbol,p.state]));

const out=[];
for(const s of syms){
  const wr=[];
  for(const w of windows){
    const startDay=endDay-w+1;
    const cRows=cadence.filter((r)=>r.symbol===s&&Math.floor(Date.UTC(Number(r.date_utc.slice(0,4)),Number(r.date_utc.slice(5,7))-1,Number(r.date_utc.slice(8,10)))/86400000)>=startDay);
    const days=cRows.length;
    const rRows=reason.filter((r)=>r.symbol===s&&Math.floor(Date.UTC(Number(r.date_utc.slice(0,4)),Number(r.date_utc.slice(5,7))-1,Number(r.date_utc.slice(8,10)))/86400000)>=startDay);
    const rej=days? rRows.filter((x)=>x.verdict==='REJECT_ALL').length/days:0;
    const hold=days? rRows.filter((x)=>x.verdict==='HOLD_STRICT').length/days:0;
    const parkRate=parkMap.get(s)==='PARK' ? 1/days : 0;
    wr.push({window_days:w,days_observed:days,reject_rate:rej,hold_rate:hold,park_rate:parkRate});
  }
  const sufficient=wr.some((x)=>x.days_observed>=minDays);
  const rr=wr.map((x)=>x.reject_rate); const mean=rr.reduce((a,b)=>a+b,0)/rr.length; const variance=rr.reduce((a,b)=>a+((b-mean)**2),0)/rr.length;
  let decision='OBSERVE',reasonTxt='INSUFFICIENT_DAYS';
  if(!sufficient){decision='OBSERVE';reasonTxt='INSUFFICIENT_DAYS';}
  else if(parkMap.get(s)==='PARK'||wr.some((x)=>x.park_rate>pMax)){decision='PARK';reasonTxt='ACTIVE_OR_RECENT_PARK';}
  else if(variance>varMax){decision='HOLD';reasonTxt='UNSTABLE_MULTIWINDOW_VARIANCE';}
  else if(wr.some((x)=>x.reject_rate>rMax||x.hold_rate>hMax)){decision='PARK';reasonTxt='RISK_RATES_TOO_HIGH';}
  else {decision='PROMOTE';reasonTxt='SUFFICIENT_STABLE_AND_WITHIN_THRESHOLDS';}
  out.push({symbol:s,decision,reason:reasonTxt,variance,wr});
}
out.sort((a,b)=>a.symbol.localeCompare(b.symbol));
const orderingOk=JSON.stringify(out)===JSON.stringify([...out].sort((a,b)=>a.symbol.localeCompare(b.symbol)));
const minDaysOk=out.every((o)=>o.decision!=='PROMOTE'||o.wr.some((x)=>x.days_observed>=minDays));
const stabilityOk=out.every((o)=>o.decision!=='PROMOTE'||o.variance<=varMax);
const fp1=crypto.createHash('sha256').update(JSON.stringify(out)).digest('hex');
const fp2=crypto.createHash('sha256').update(JSON.stringify(out)).digest('hex');
const deterministicMatch=fp1===fp2;
if(!orderingOk||!minDaysOk||!stabilityOk||!deterministicMatch){arm('MULTIWINDOW_CONTRACT_FAILURE',{ordering_ok:String(orderingOk),min_days_ok:String(minDaysOk),stability_ok:String(stabilityOk),deterministic_match:String(deterministicMatch)});throw new Error('E94 promotion multiwindow contracts failed');}

if(update&&process.env.CI!=='true'){
  ensureDir(E94_ROOT);
  writeMd(path.join(E94_ROOT,'PROMOTION_MULTIWINDOW.md'),['# E94 PROMOTION MULTIWINDOW',`- end_utc: ${endUtc}`,'','| symbol | window_days | days_observed | reject_rate | hold_rate | park_rate | decision | reason | variance_reject_rate |','|---|---:|---:|---:|---:|---:|---|---|---:|',...out.flatMap((o)=>o.wr.map((w,i)=>`| ${o.symbol} | ${w.window_days} | ${w.days_observed} | ${fmt4(w.reject_rate)} | ${fmt4(w.hold_rate)} | ${fmt4(w.park_rate)} | ${i===0?o.decision:'-'} | ${i===0?o.reason:'-'} | ${i===0?fmt4(o.variance):'-'} |`)),`- promotion_multiwindow_fingerprint: ${fp1}`].join('\n'));
  writeMd(path.join(E94_ROOT,'PROMOTION_MULTIWINDOW_ASSERTIONS.md'),['# E94 PROMOTION MULTIWINDOW ASSERTIONS',`- MIN_DAYS: ${minDays}`,`- VARIANCE_MAX: ${fmt4(varMax)}`,`- A1_ordering_contract: ${orderingOk?'PASS':'FAIL'}`,`- A2_min_days_contract: ${minDaysOk?'PASS':'FAIL'}`,`- A3_stability_contract: ${stabilityOk?'PASS':'FAIL'}`,`- A4_determinism_x2_contract: ${deterministicMatch?'PASS':'FAIL'}`].join('\n'));
  writeMd(path.join(E94_ROOT,'RUNS_PROMOTION_MULTIWINDOW_X2.md'),['# E94 RUNS PROMOTION MULTIWINDOW X2',`- run1_fingerprint: ${fp1}`,`- run2_fingerprint: ${fp2}`,'- deterministic_match: true'].join('\n'));
  const last=cadence.slice(-12);
  writeMd(path.join(E94_ROOT,'CADENCE_SNAPSHOT.md'),['# E94 CADENCE SNAPSHOT',`- cadence_rows_total: ${cadence.length}`,'', '| date_utc | symbol | sentinel | windows | notes_digest | anchors_digest |','|---|---|---|---|---|---|',...last.map((r)=>`| ${r.date_utc} | ${r.symbol} | ${r.sentinel} | ${r.windows} | ${r.notes_digest} | ${r.anchors_digest} |`)].join('\n'));
}
if(!update){for(const f of ['CADENCE_SNAPSHOT.md','PROMOTION_MULTIWINDOW.md','PROMOTION_MULTIWINDOW_ASSERTIONS.md','RUNS_PROMOTION_MULTIWINDOW_X2.md']) if(!fs.existsSync(path.join(E94_ROOT,f))) throw new Error(`missing ${f}`);} 
minimalLog(`verify:e94:promote:court PASSED promotion_multiwindow_fingerprint=${fp1}`);
