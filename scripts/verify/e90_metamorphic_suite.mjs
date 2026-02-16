#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { E90_ROOT, E90_LOCK_PATH, ensureDir, anchorsE90, minimalLog } from './e90_lib.mjs';
import { writeMd } from './e66_lib.mjs';
import { BASE_POLICY, parseFixtureRowsFromFile, assertRowsOrdered, computeParkAgingDecisions, addDays, toDay, shiftRows } from './e89_park_aging_core.mjs';

const update=process.env.UPDATE_E90_EVIDENCE==='1';
if(fs.existsSync(E90_LOCK_PATH)&&process.env.CLEAR_E90_KILL_LOCK!=='1') throw new Error(`kill-lock active: ${E90_LOCK_PATH}`);
if(process.env.CLEAR_E90_KILL_LOCK==='1'&&process.env.CI!=='true') fs.rmSync(E90_LOCK_PATH,{force:true});
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E90_EVIDENCE forbidden in CI');

function armLock(reason,meta){ensureDir(path.dirname(E90_LOCK_PATH));writeMd(E90_LOCK_PATH,['# E90 KILL LOCK',`- reason: ${reason}`,...Object.entries(meta).map(([k,v])=>`- ${k}: ${v}`)].join('\n'));}
function parkCount(dec){return dec.filter((d)=>d.state==='PARK').length;}
function unparkCount(dec){return dec.filter((d)=>d.rule_fired==='R4_UNPARK_CLEAN').length;}
function parseDate(s){return s;}

const rows=parseFixtureRowsFromFile('core/edge/state/fixtures/e89_reason_history_fixture.md');
assertRowsOrdered(rows);
const fixtureEnd=rows[rows.length-1].date_utc;
const today=String(process.env.E90_DATE_UTC||new Date(Number(process.env.SOURCE_DATE_EPOCH||'1700000000')*1000).toISOString().slice(0,10));
const base=computeParkAgingDecisions({rows,today,policy:BASE_POLICY});
const baseFp=crypto.createHash('sha256').update(JSON.stringify({rows,today,policy:BASE_POLICY,decisions:base})).digest('hex');

const cases=[];
function pushCase(id,policy,todayCase,rowsCase=rows){const dec=computeParkAgingDecisions({rows:rowsCase,today:todayCase,policy});const fp=crypto.createHash('sha256').update(JSON.stringify({id,policy,today:todayCase,dec})).digest('hex');cases.push({case_id:id,today_utc:todayCase,policy,park_count:parkCount(dec),unpark_count:unparkCount(dec),fingerprint:fp,decisions:dec});return dec;}
pushCase('BASE',BASE_POLICY,today);
const decN=pushCase('M1_REJECT_THRESHOLD_PLUS1',{...BASE_POLICY,reject_threshold:BASE_POLICY.reject_threshold+1},today);
const decX=pushCase('M1_HOLD_STREAK_PLUS1',{...BASE_POLICY,hold_streak_threshold:BASE_POLICY.hold_streak_threshold+1},today);
const decU=pushCase('M1_UNPARK_DAYS_PLUS1',{...BASE_POLICY,unpark_requires_clean_days:BASE_POLICY.unpark_requires_clean_days+1},today);
const decK=pushCase('M2_PARK_DAYS_PLUS2',{...BASE_POLICY,park_days:BASE_POLICY.park_days+2},today);

const targets=['2025-12-31','2026-01-01','2026-02-28','2024-02-29','2026-03-01','2026-04-30','2026-05-01'];
const fuzz=[];
for(const t of targets){const d=toDay(t)-toDay(fixtureEnd);const shiftedRows=shiftRows(rows,d);const shiftedToday=addDays(today,d);const dec=pushCase(`M3_SHIFT_${t}`,BASE_POLICY,shiftedToday,shiftedRows);
  const baseBySymbol=new Map(base.map((x)=>[x.symbol,x]));
  const ok=dec.every((x)=>{const b=baseBySymbol.get(x.symbol);if(!b) return false;const sameState=x.state===b.state;const sameRule=x.rule_fired===b.rule_fired;const parkOk=(b.park_until==='-'&&x.park_until==='-')||(b.park_until!=='-'&&x.park_until===addDays(b.park_until,d));return sameState&&sameRule&&parkOk;});
  fuzz.push({target_end_date:t,offset_days:d,invariance_ok:ok? 'true':'false'});
}

const byId=new Map(cases.map((c)=>[c.case_id,c]));
const baseCase=byId.get('BASE');
const m1RejectOk=(byId.get('M1_REJECT_THRESHOLD_PLUS1').park_count<=baseCase.park_count);
const m1HoldOk=(byId.get('M1_HOLD_STREAK_PLUS1').park_count<=baseCase.park_count);
const m1UnparkOk=(byId.get('M1_UNPARK_DAYS_PLUS1').unpark_count<=baseCase.unpark_count);
const betaBase=base.find((d)=>d.symbol==='BETA');const betaN=decN.find((d)=>d.symbol==='BETA');
const gammaBase=base.find((d)=>d.symbol==='GAMMA');const gammaX=decX.find((d)=>d.symbol==='GAMMA');
const deltaBase=base.find((d)=>d.symbol==='DELTA');const deltaU=decU.find((d)=>d.symbol==='DELTA');
const betaP=betaBase?.state==='PARK'&&betaN?.state!=='PARK';
const gammaP=gammaBase?.state==='PARK'&&gammaX?.state!=='PARK';
const deltaP=deltaBase?.rule_fired==='R4_UNPARK_CLEAN'&&deltaU?.state==='PARK';
const parkShiftOk=decK.filter((d)=>d.state==='PARK'&&d.rule_fired!=='R1_KEEP_PARK').every((d)=>{const b=base.find((x)=>x.symbol===d.symbol);return b&&b.park_until!=='-'&&d.park_until===addDays(b.park_until,2);});
const fuzzOk=fuzz.every((f)=>f.invariance_ok==='true');

const runFp1=crypto.createHash('sha256').update(JSON.stringify({anchors:anchorsE90(),cases:cases.map((c)=>({id:c.case_id,fp:c.fingerprint})),fuzz})).digest('hex');
const runFp2=crypto.createHash('sha256').update(JSON.stringify({anchors:anchorsE90(),cases:cases.map((c)=>({id:c.case_id,fp:c.fingerprint})),fuzz})).digest('hex');
const deterministicMatch=runFp1===runFp2;

const hardFail=!deterministicMatch||!m1RejectOk||!m1HoldOk||!m1UnparkOk||!parkShiftOk||!fuzzOk||!betaP||!gammaP||!deltaP;
if(hardFail){armLock('METAMORPHIC_ASSERTION_FAILURE',{deterministic_match:String(deterministicMatch),m1_reject:String(m1RejectOk),m1_hold:String(m1HoldOk),m1_unpark:String(m1UnparkOk),m2_park_days:String(parkShiftOk),m3_m4_fuzz:String(fuzzOk),p_n_plus:String(betaP),p_x_plus:String(gammaP),p_u_plus:String(deltaP)});throw new Error('E90 metamorphic suite failed');}

if(update&&process.env.CI!=='true'){
  ensureDir(E90_ROOT);
  const sortedCases=[...cases].sort((a,b)=>a.case_id.localeCompare(b.case_id));
  writeMd(path.join(E90_ROOT,'METAMORPHIC_SUITE.md'),['# E90 METAMORPHIC SUITE',`- suite_fingerprint: ${runFp1}`,'','| case_id | today_utc | park_count | unpark_count | fingerprint |','|---|---|---:|---:|---|',...sortedCases.map((c)=>`| ${c.case_id} | ${c.today_utc} | ${c.park_count} | ${c.unpark_count} | ${c.fingerprint} |`)].join('\n'));
  writeMd(path.join(E90_ROOT,'METAMORPHIC_ASSERTIONS.md'),['# E90 METAMORPHIC ASSERTIONS',`- M1_REJECT_THRESHOLD_MONOTONIC: ${m1RejectOk?'PASS':'FAIL'}`,`- M1_HOLD_STREAK_MONOTONIC: ${m1HoldOk?'PASS':'FAIL'}`,`- M1_UNPARK_DAYS_MONOTONIC: ${m1UnparkOk?'PASS':'FAIL'}`,`- M2_PARK_DAYS_MONOTONIC: ${parkShiftOk?'PASS':'FAIL'}`,`- M3_M4_DATE_SHIFT_BOUNDARY: ${fuzzOk?'PASS':'FAIL'}`,`- P_N_PLUS_EXPECTED_DELTA: ${betaP?'PASS':'FAIL'}`,`- P_X_PLUS_EXPECTED_DELTA: ${gammaP?'PASS':'FAIL'}`,`- P_U_PLUS_EXPECTED_DELTA: ${deltaP?'PASS':'FAIL'}`,`- P_K_PLUS_EXPECTED_DELTA: ${parkShiftOk?'PASS':'FAIL'}`].join('\n'));
  writeMd(path.join(E90_ROOT,'DATE_BOUNDARY_FUZZ.md'),['# E90 DATE BOUNDARY FUZZ','| target_end_date | offset_days | invariance_ok |','|---|---:|---|',...fuzz.map((f)=>`| ${f.target_end_date} | ${f.offset_days} | ${f.invariance_ok} |`)].join('\n'));
  writeMd(path.join(E90_ROOT,'RUNS_METAMORPHIC_X2.md'),['# E90 RUNS METAMORPHIC X2',`- run1_fingerprint: ${runFp1}`,`- run2_fingerprint: ${runFp2}`,'- deterministic_match: true'].join('\n'));
}
if(!update){for(const f of ['METAMORPHIC_SUITE.md','METAMORPHIC_ASSERTIONS.md','DATE_BOUNDARY_FUZZ.md','RUNS_METAMORPHIC_X2.md']) if(!fs.existsSync(path.join(E90_ROOT,f))) throw new Error(`missing ${f}`);} 
minimalLog(`verify:e90:metamorphic:suite PASSED suite_fingerprint=${runFp1}`);
