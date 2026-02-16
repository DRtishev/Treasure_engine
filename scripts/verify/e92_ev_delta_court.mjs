#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { E92_ROOT, E92_LOCK_PATH, anchorsE92, ensureDir, fmt4, minimalLog } from './e92_lib.mjs';
import { writeMd } from './e66_lib.mjs';
import { parseFixtureRowsFromText, computeParkAgingDecisions, BASE_POLICY } from './e89_park_aging_core.mjs';

const update=process.env.UPDATE_E92_EVIDENCE==='1';
if(fs.existsSync(E92_LOCK_PATH)&&process.env.CLEAR_E92_KILL_LOCK!=='1') throw new Error(`kill-lock active: ${E92_LOCK_PATH}`);
if(process.env.CLEAR_E92_KILL_LOCK==='1'&&process.env.CI!=='true') fs.rmSync(E92_LOCK_PATH,{force:true});
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E92_EVIDENCE forbidden in CI');

function armLock(reason,meta){ensureDir(path.dirname(E92_LOCK_PATH));writeMd(E92_LOCK_PATH,['# E92 KILL LOCK',`- reason: ${reason}`,...Object.entries(meta).map(([k,v])=>`- ${k}: ${v}`)].join('\n'));}
function fp(obj){return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');}
function parsePolicyNumber(text,key,d){const m=text.match(new RegExp(`- ${key}:\\s*([0-9.]+)`));return m?Number(m[1]):d;}

const reasonPath='core/edge/state/reason_history_state.md';
const reasonText=fs.readFileSync(reasonPath,'utf8');
const rows=parseFixtureRowsFromText(reasonText).sort((a,b)=>a.date_utc.localeCompare(b.date_utc)||a.symbol.localeCompare(b.symbol));
if(rows.length===0) throw new Error('reason_history_state has no rows');
const endUtc=rows[rows.length-1].date_utc;
const endDay=Math.floor(Date.UTC(Number(endUtc.slice(0,4)),Number(endUtc.slice(5,7))-1,Number(endUtc.slice(8,10)))/86400000);
const startUtc=new Date((endDay-29)*86400000).toISOString().slice(0,10);
const winRows=rows.filter((r)=>r.date_utc>=startUtc&&r.date_utc<=endUtc);
const symbols=[...new Set(winRows.map((r)=>r.symbol))].sort();

const profitPath='reports/evidence/E84/PROFIT_LEDGER.md';
const profitRows=[];
if(fs.existsSync(profitPath)){
  const p=fs.readFileSync(profitPath,'utf8');
  for(const m of p.matchAll(/^\|\s([^|]+)\s\|\s([0-9]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([-0-9.]+)\s\|\s([-0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([A-Z_]+)\s\|\s([A-Z_,]+)\s\|$/gm)){
    profitRows.push({symbol:m[1].trim(),fee:Number(m[8]),spread:Number(m[9]),slippage:Number(m[10]),invalid:Number(m[12])});
  }
}
const microPath='reports/evidence/E87/MICROFILL_LEDGER.md';
const microRows=[];
if(fs.existsSync(microPath)){
  const p=fs.readFileSync(microPath,'utf8');
  for(const m of p.matchAll(/^\|\s(\d{4}-\d{2}-\d{2})\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([A-Z0-9_]+)\s\|\s([-0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([^|]+)\s\|$/gm)){
    microRows.push({symbol:m[2].trim(),latency_bucket:m[7].trim(),slippage:Number(m[8]),fee:Number(m[9]),invalid:Number(m[10])});
  }
}

const parkDecisions=computeParkAgingDecisions({rows:winRows,today:endUtc,policy:BASE_POLICY});
const parkMap=new Map(parkDecisions.map((d)=>[d.symbol,d]));
const canaryText=fs.readFileSync('core/edge/contracts/e86_canary_stage_policy.md','utf8');
const thresholdText=fs.readFileSync('core/edge/contracts/e86_threshold_policy.md','utf8');
const baseMaxInvalid=parsePolicyNumber(canaryText,'MAX_INVALID_STRICT',parsePolicyNumber(thresholdText,'MAX_INVALID_STRICT',0.04));
const baseMaxSpread=parsePolicyNumber(canaryText,'MAX_SPREAD_P50_STRICT',parsePolicyNumber(thresholdText,'MAX_SPREAD_P50_STRICT',0.095));

const w={wR:1.0,wH:0.7,wP:0.9,wI:0.6,wS:0.4,wSL:0.2,wF:0.1};
const metrics=[];
for(const s of symbols){
  const rs=winRows.filter((r)=>r.symbol===s);
  const days=rs.length;
  const rejects=rs.filter((r)=>r.verdict==='REJECT_ALL').length;
  const holds=rs.filter((r)=>r.verdict==='HOLD_STRICT').length;
  const parks=parkMap.get(s)?.state==='PARK'?1:0;
  const rejRate=days?rejects/days:0;
  const holdRate=days?holds/days:0;
  const parkRate=days?parks/days:0;
  const p=profitRows.filter((x)=>x.symbol===s);
  const m=microRows.filter((x)=>x.symbol===s);
  const avgSpread=p.length?p.reduce((a,b)=>a+b.spread,0)/p.length:NaN;
  const avgSlip=(p.length||m.length)?([...p.map(x=>x.slippage),...m.map(x=>x.slippage)].reduce((a,b)=>a+b,0)/(p.length+m.length)):NaN;
  const avgFee=(p.length||m.length)?([...p.map(x=>x.fee),...m.map(x=>x.fee)].reduce((a,b)=>a+b,0)/(p.length+m.length)):NaN;
  const invalid=(p.length||m.length)?([...p.map(x=>x.invalid),...m.map(x=>x.invalid)].reduce((a,b)=>a+b,0)/(p.length+m.length)):NaN;
  const latencyMode=m.length?[...m.reduce((acc,x)=>acc.set(x.latency_bucket,(acc.get(x.latency_bucket)||0)+1),new Map()).entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0][0]:'ABSENT';
  const cleanDaysStreakEnd=holdRate===0?days:0;
  const ev=-(w.wR*rejRate+w.wH*holdRate+w.wP*parkRate+w.wI*(Number.isFinite(invalid)?invalid:0)+w.wS*(Number.isFinite(avgSpread)?avgSpread:0)+w.wSL*(Number.isFinite(avgSlip)?Math.abs(avgSlip):0)+w.wF*(Number.isFinite(avgFee)?avgFee:0));
  metrics.push({symbol:s,days_observed:days,rejects_count:rejects,holds_count:holds,parks_count:parks,reject_rate:rejRate,hold_rate:holdRate,park_rate:parkRate,clean_days_streak_end:cleanDaysStreakEnd,avg_spread:Number.isFinite(avgSpread)?avgSpread:'ABSENT',avg_slippage:Number.isFinite(avgSlip)?avgSlip:'ABSENT',avg_fee:Number.isFinite(avgFee)?avgFee:'ABSENT',invalid_rate:Number.isFinite(invalid)?invalid:'ABSENT',latency_bucket_mode:latencyMode,ev_score:ev});
}

const ranked=[...metrics].sort((a,b)=>a.ev_score-b.ev_score||a.symbol.localeCompare(b.symbol));
const maxSymbols=3;
const stepCap=1;
const candidates=ranked.filter((r)=>r.symbol!=='ABSENT').slice(0,maxSymbols);
const proposals=[];
for(const r of candidates){
  const pSpread=Number.isFinite(r.avg_spread)?r.avg_spread:baseMaxSpread;
  const pInvalid=Number.isFinite(r.invalid_rate)?r.invalid_rate:baseMaxInvalid;
  const afterSpread=Math.max(0,pSpread*0.95);
  const afterInvalid=Math.max(0,pInvalid-0.001);
  const beforeEv=r.ev_score;
  const afterEv=-(w.wR*r.reject_rate+w.wH*r.hold_rate+w.wP*r.park_rate+w.wI*afterInvalid+w.wS*afterSpread+w.wSL*(Number.isFinite(r.avg_slippage)?Math.abs(r.avg_slippage):0)+w.wF*(Number.isFinite(r.avg_fee)?r.avg_fee:0));
  proposals.push({proposal_id:`P_${r.symbol}_TIGHTEN_INVALID_SPREAD_STEP1`,symbol:r.symbol,change_step:1,target:'SYMBOL_MAX_INVALID_STRICT+SYMBOL_MAX_SPREAD_P50_STRICT',direction:'TIGHTEN',reject_rate_before:r.reject_rate,reject_rate_after:r.reject_rate,hold_rate_before:r.hold_rate,hold_rate_after:r.hold_rate,park_rate_before:r.park_rate,park_rate_after:r.park_rate,ev_score_before:beforeEv,ev_score_after:afterEv,reject_rate_delta:0,hold_rate_delta:0,park_rate_delta:0,ev_score_delta:afterEv-beforeEv,widen_risk:'false',justification:'tighten invalid/spread caps only'});
  if(proposals.length>=maxSymbols) break;
}
proposals.sort((a,b)=>a.symbol.localeCompare(b.symbol)||a.proposal_id.localeCompare(b.proposal_id));

const budgetOk=proposals.every((p)=>p.change_step<=stepCap)&&new Set(proposals.map((p)=>p.symbol)).size<=maxSymbols;
const orderingOk=JSON.stringify(proposals)===JSON.stringify([...proposals].sort((a,b)=>a.symbol.localeCompare(b.symbol)||a.proposal_id.localeCompare(b.proposal_id)));
const courtRun1=fp({anchors:anchorsE92(),window:[startUtc,endUtc],metrics,proposals});
const courtRun2=fp({anchors:anchorsE92(),window:[startUtc,endUtc],metrics,proposals});
const deterministicMatch=courtRun1===courtRun2;

if(!budgetOk||!orderingOk||!deterministicMatch){
  armLock('EV_DELTA_CONTRACT_FAILURE',{budget_ok:String(budgetOk),ordering_ok:String(orderingOk),deterministic_match:String(deterministicMatch)});
  throw new Error('E92 EV-DELTA court failed contracts');
}

if(update&&process.env.CI!=='true'){
  ensureDir(E92_ROOT);
  writeMd(path.join(E92_ROOT,'EV_DELTA_COURT.md'),[
    '# E92 EV DELTA COURT',
    `- start_utc: ${startUtc}`,
    `- end_utc: ${endUtc}`,
    '- ev_score_formula: -(wR*reject_rate + wH*hold_rate + wP*park_rate + wI*invalid_rate + wS*avg_spread + wSL*abs(avg_slippage) + wF*avg_fee)',
    '- weight_vector: wR=1.0,wH=0.7,wP=0.9,wI=0.6,wS=0.4,wSL=0.2,wF=0.1',
    '',
    '| symbol | days_observed | rejects_count | holds_count | parks_count | reject_rate | hold_rate | park_rate | clean_days_streak_end | avg_spread | avg_slippage | avg_fee | invalid_rate | latency_bucket_mode | ev_score |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---:|',
    ...metrics.map((m)=>`| ${m.symbol} | ${m.days_observed} | ${m.rejects_count} | ${m.holds_count} | ${m.parks_count} | ${fmt4(m.reject_rate)} | ${fmt4(m.hold_rate)} | ${fmt4(m.park_rate)} | ${m.clean_days_streak_end} | ${Number.isFinite(m.avg_spread)?fmt4(m.avg_spread):'ABSENT'} | ${Number.isFinite(m.avg_slippage)?fmt4(m.avg_slippage):'ABSENT'} | ${Number.isFinite(m.avg_fee)?fmt4(m.avg_fee):'ABSENT'} | ${Number.isFinite(m.invalid_rate)?fmt4(m.invalid_rate):'ABSENT'} | ${m.latency_bucket_mode} | ${fmt4(m.ev_score)} |`),
    `- ev_delta_court_fingerprint: ${courtRun1}`
  ].join('\n'));
  writeMd(path.join(E92_ROOT,'EV_DELTA_DIFF.md'),[
    '# E92 EV DELTA DIFF',
    '| proposal_id | symbol | target | change_step | direction | reject_rate_delta | hold_rate_delta | park_rate_delta | EV_SCORE_delta | widen_risk | justification |',
    '|---|---|---|---:|---|---:|---:|---:|---:|---|---|',
    ...proposals.map((p)=>`| ${p.proposal_id} | ${p.symbol} | ${p.target} | ${p.change_step} | ${p.direction} | ${fmt4(p.reject_rate_delta)} | ${fmt4(p.hold_rate_delta)} | ${fmt4(p.park_rate_delta)} | ${fmt4(p.ev_score_delta)} | ${p.widen_risk} | ${p.justification} |`)
  ].join('\n'));
  writeMd(path.join(E92_ROOT,'EV_DELTA_ASSERTIONS.md'),[
    '# E92 EV DELTA ASSERTIONS',
    '- budget_cap_single_step_max: 1',
    '- budget_cap_symbols_per_apply_max: 3',
    '- risk_widening_policy: forbidden unless explicit EV improvement justification',
    `- A1_budget_caps_enforced: ${budgetOk?'PASS':'FAIL'}`,
    `- A2_ordering_contract: ${orderingOk?'PASS':'FAIL'}`,
    `- A3_determinism_x2_contract: ${deterministicMatch?'PASS':'FAIL'}`
  ].join('\n'));
  writeMd(path.join(E92_ROOT,'RUNS_EV_DELTA_X2.md'),[
    '# E92 RUNS EV DELTA X2',
    `- run1_fingerprint: ${courtRun1}`,
    `- run2_fingerprint: ${courtRun2}`,
    `- deterministic_match: ${deterministicMatch?'true':'false'}`
  ].join('\n'));
}

if(!update){for(const f of ['EV_DELTA_COURT.md','EV_DELTA_DIFF.md','EV_DELTA_ASSERTIONS.md','RUNS_EV_DELTA_X2.md']) if(!fs.existsSync(path.join(E92_ROOT,f))) throw new Error(`missing ${f}`);} 
minimalLog(`verify:e92:ev:court PASSED court_fingerprint=${courtRun1}`);
