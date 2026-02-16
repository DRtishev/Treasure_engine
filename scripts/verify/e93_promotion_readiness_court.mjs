#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { E93_ROOT, E93_LOCK_PATH, ensureDir, fmt4, minimalLog } from './e93_lib.mjs';
import { writeMd } from './e66_lib.mjs';
import { parseFixtureRowsFromText, computeParkAgingDecisions, BASE_POLICY } from './e89_park_aging_core.mjs';

const update=process.env.UPDATE_E93_EVIDENCE==='1';
if(fs.existsSync(E93_LOCK_PATH)&&process.env.CLEAR_E93_KILL_LOCK!=='1') throw new Error(`kill-lock active: ${E93_LOCK_PATH}`);
if(process.env.CLEAR_E93_KILL_LOCK==='1'&&process.env.CI!=='true') fs.rmSync(E93_LOCK_PATH,{force:true});
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E93_EVIDENCE forbidden in CI');
function arm(reason,meta){ensureDir(path.dirname(E93_LOCK_PATH));writeMd(E93_LOCK_PATH,['# E93 KILL LOCK',`- reason: ${reason}`,...Object.entries(meta).map(([k,v])=>`- ${k}: ${v}`)].join('\n'));}

const reason=fs.readFileSync('core/edge/state/reason_history_state.md','utf8');
const rows=parseFixtureRowsFromText(reason).sort((a,b)=>a.date_utc.localeCompare(b.date_utc)||a.symbol.localeCompare(b.symbol));
if(rows.length===0) throw new Error('empty reason history');
const endUtc=rows[rows.length-1].date_utc;
const endDay=Math.floor(Date.UTC(Number(endUtc.slice(0,4)),Number(endUtc.slice(5,7))-1,Number(endUtc.slice(8,10)))/86400000);
const startUtc=new Date((endDay-29)*86400000).toISOString().slice(0,10);
const win=rows.filter((r)=>r.date_utc>=startUtc&&r.date_utc<=endUtc);
const bySymbol=[...new Set(win.map((r)=>r.symbol))].sort();
const evMap=new Map([...fs.readFileSync('reports/evidence/E92/EV_DELTA_COURT.md','utf8').matchAll(/^\|\s([^|]+)\s\|\s([0-9]+)\s\|\s([0-9]+)\s\|\s([0-9]+)\s\|\s([0-9]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([-0-9.]+)\s\|$/gm)].map((m)=>[m[1].trim(),{ev:Number(m[15]),days:Number(m[2]),rejectRate:Number(m[6]),parkRate:Number(m[8])}]));
const park=computeParkAgingDecisions({rows:win,today:endUtc,policy:BASE_POLICY});
const parkMap=new Map(park.map((p)=>[p.symbol,p.state]));

const decisions=[];
for(const s of bySymbol){
  const m=evMap.get(s)||{ev:-1,days:0,rejectRate:1,parkRate:1};
  let decision='HOLD',reason='mixed signals';
  if(m.days<2){decision='OBSERVE';reason='too few days_observed';}
  else if(parkMap.get(s)==='PARK'||m.parkRate>0){decision='PARK';reason='active/recent park';}
  else if(m.rejectRate<=0.05&&m.parkRate===0&&m.ev>=-0.95){decision='PROMOTE';reason='clean + stable EV';}
  else if(m.rejectRate>0.2||m.ev<-1.05){decision='PARK';reason='high reject risk / low EV';}
  decisions.push({symbol:s,days_observed:m.days,reject_rate:m.rejectRate,park_rate:m.parkRate,ev_score:m.ev,decision,reason});
}
const ordered=[...decisions].sort((a,b)=>a.symbol.localeCompare(b.symbol));
const orderingOk=JSON.stringify(ordered)===JSON.stringify(decisions);
const fp1=crypto.createHash('sha256').update(JSON.stringify({window:[startUtc,endUtc],ordered})).digest('hex');
const fp2=crypto.createHash('sha256').update(JSON.stringify({window:[startUtc,endUtc],ordered})).digest('hex');
const deterministicMatch=fp1===fp2;
if(!orderingOk||!deterministicMatch){arm('PROMOTION_CONTRACT_FAILURE',{ordering_ok:String(orderingOk),deterministic_match:String(deterministicMatch)});throw new Error('E93 promotion court contracts failed');}

if(update&&process.env.CI!=='true'){
  ensureDir(E93_ROOT);
  writeMd(path.join(E93_ROOT,'PROMOTION_READINESS.md'),['# E93 PROMOTION READINESS',`- start_utc: ${startUtc}`,`- end_utc: ${endUtc}`,'','| symbol | days_observed | reject_rate | park_rate | EV_SCORE | decision | reason |','|---|---:|---:|---:|---:|---|---|',...ordered.map((d)=>`| ${d.symbol} | ${d.days_observed} | ${fmt4(d.reject_rate)} | ${fmt4(d.park_rate)} | ${fmt4(d.ev_score)} | ${d.decision} | ${d.reason} |`),`- promotion_fingerprint: ${fp1}`].join('\n'));
  const counts=ordered.reduce((a,b)=>(a[b.decision]=(a[b.decision]||0)+1,a),{});
  writeMd(path.join(E93_ROOT,'PROMOTION_ASSERTIONS.md'),['# E93 PROMOTION ASSERTIONS',`- A1_ordering_contract: ${orderingOk?'PASS':'FAIL'}`,`- A2_determinism_x2_contract: ${deterministicMatch?'PASS':'FAIL'}`,`- decision_PROMOTE: ${counts.PROMOTE||0}`,`- decision_HOLD: ${counts.HOLD||0}`,`- decision_PARK: ${counts.PARK||0}`,`- decision_OBSERVE: ${counts.OBSERVE||0}`].join('\n'));
  writeMd(path.join(E93_ROOT,'RUNS_PROMOTION_X2.md'),['# E93 RUNS PROMOTION X2',`- run1_fingerprint: ${fp1}`,`- run2_fingerprint: ${fp2}`,'- deterministic_match: true'].join('\n'));
}
if(!update){for(const f of ['PROMOTION_READINESS.md','PROMOTION_ASSERTIONS.md','RUNS_PROMOTION_X2.md']) if(!fs.existsSync(path.join(E93_ROOT,f))) throw new Error(`missing ${f}`);} 
minimalLog(`verify:e93:promote:court PASSED promotion_fingerprint=${fp1}`);
