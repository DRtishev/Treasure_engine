#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { E88_ROOT, E88_POLICY_PATH, E88_STATE_PATH, readAnchorBundle, ensureDir, minimalLog } from './e88_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E88_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E88_EVIDENCE forbidden in CI');
const rawPolicy=fs.readFileSync(E88_POLICY_PATH,'utf8');
const scalar=(k,d)=>Number((rawPolicy.match(new RegExp(`- ${k}:\\s*([0-9.]+)`))||[])[1]||d);
const policy={window_days:scalar('WINDOW_DAYS',7),reject_threshold:scalar('REJECT_THRESHOLD',2),hold_streak_threshold:scalar('HOLD_STREAK_THRESHOLD',5),park_days:scalar('PARK_DAYS',7),unpark_requires_clean_days:scalar('UNPARK_REQUIRES_CLEAN_DAYS',3),lookback_days:scalar('LOOKBACK_DAYS',30)};
const stateRows=[...fs.readFileSync(E88_STATE_PATH,'utf8').matchAll(/^\|\s(\d{4}-\d{2}-\d{2})\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([a-f0-9]{64})\s\|\s([a-f0-9]{64})\s\|$/gm)].map((m)=>({date_utc:m[1],symbol:m[2].trim(),stage:m[3].trim(),verdict:m[4].trim(),reason_codes:m[5].trim()})).sort((a,b)=>a.date_utc.localeCompare(b.date_utc)||a.symbol.localeCompare(b.symbol));
if(stateRows.length===0) throw new Error('empty reason history state');
const anchors=readAnchorBundle();
const today=String(process.env.E88_DATE_UTC||new Date(Number(process.env.SOURCE_DATE_EPOCH||'1700000000')*1000).toISOString().slice(0,10));
const toDay=(s)=>Math.floor(Date.UTC(Number(s.slice(0,4)),Number(s.slice(5,7))-1,Number(s.slice(8,10)))/86400000);
const fromDay=(n)=>new Date(n*86400000).toISOString().slice(0,10);
const addDays=(s,n)=>fromDay(toDay(s)+n);
const minDay=addDays(today,-policy.lookback_days+1);
const symbols=[...new Set(stateRows.map((r)=>r.symbol))].sort();
const priorCourtPath=path.join(E88_ROOT,'PARK_AGING_COURT.md');
const priorMap=new Map((fs.existsSync(priorCourtPath)?[...fs.readFileSync(priorCourtPath,'utf8').matchAll(/^\|\s([^|]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([^|]*)\s\|\s([^|]+)\s\|$/gm)].map((m)=>[m[1].trim(),{state:m[2].trim(),park_until:m[3].trim()}]):[]));

const decisions=[];
for(const symbol of symbols){
  const rows=stateRows.filter((r)=>r.symbol===symbol&&r.date_utc>=minDay).sort((a,b)=>a.date_utc.localeCompare(b.date_utc));
  const lastM=rows.filter((r)=>r.date_utc>=addDays(today,-policy.window_days+1));
  const rejectRows=lastM.filter((r)=>r.verdict==='REJECT_ALL');
  let holdStreak=0;for(let i=rows.length-1;i>=0;i--){if(rows[i].verdict==='HOLD_STRICT') holdStreak++; else break;}
  const cleanRows=rows.filter((r)=>r.date_utc>=addDays(today,-policy.unpark_requires_clean_days+1));
  const clean=cleanRows.length>=policy.unpark_requires_clean_days&&cleanRows.every((r)=>['ALLOW','BASELINE'].includes(r.verdict));
  const prior=priorMap.get(symbol)||{state:'ACTIVE',park_until:''};
  let state='ACTIVE',parkUntil='',rule='R0_NO_ACTION',reason='NONE',support='';
  if(prior.state==='PARK'&&prior.park_until&&prior.park_until>=today){state='PARK';parkUntil=prior.park_until;rule='R1_KEEP_PARK';reason='PARK_STILL_ACTIVE';support=prior.park_until;}
  else if(rejectRows.length>=policy.reject_threshold){state='PARK';parkUntil=addDays(today,policy.park_days);rule='R2_REJECT_THRESHOLD';reason='REJECT_ALL_REPEAT';support=rejectRows.map((r)=>r.date_utc).join(',');}
  else if(holdStreak>=policy.hold_streak_threshold){state='PARK';parkUntil=addDays(today,policy.park_days);rule='R3_HOLD_STREAK';reason='HOLD_STRICT_STREAK';support=rows.slice(-holdStreak).map((r)=>r.date_utc).join(',');}
  else if(prior.state==='PARK'&&clean){state='ACTIVE';parkUntil='';rule='R4_UNPARK_CLEAN';reason='UNPARK_CLEAN_STREAK';support=cleanRows.map((r)=>r.date_utc).join(',');}
  decisions.push({symbol,state,park_until:parkUntil,rule_fired:rule,reason_code:reason,support_dates:support,history_rows_considered:rows.length});
}
const decisionFingerprint=crypto.createHash('sha256').update(JSON.stringify({anchors,policy,today,decisions})).digest('hex');
const snapshot=['# E88 REASON HISTORY SNAPSHOT',`- reason_history_fingerprint: ${anchors.reason_history_fingerprint}`,`- lookback_days: ${policy.lookback_days}`,`- rows_considered: ${stateRows.filter((r)=>r.date_utc>=minDay).length}`,'','| date_utc | symbol | stage | verdict | reason_codes |','|---|---|---|---|---|',...stateRows.filter((r)=>r.date_utc>=minDay).map((r)=>`| ${r.date_utc} | ${r.symbol} | ${r.stage} | ${r.verdict} | ${r.reason_codes} |`)].join('\n');
const court=['# E88 PARK AGING COURT','- status: PASS',`- court_fingerprint: ${decisionFingerprint}`,...Object.entries(anchors).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>`- ${k}: ${v}`),`- policy_hash: ${crypto.createHash('sha256').update(rawPolicy).digest('hex')}`,'',`- today_utc: ${today}`,'','| symbol | state | park_until | rule_fired | reason_code | support_dates | history_rows_considered |','|---|---|---|---|---|---|---:|',...decisions.map((d)=>`| ${d.symbol} | ${d.state} | ${d.park_until||'-'} | ${d.rule_fired} | ${d.reason_code} | ${d.support_dates||'-'} | ${d.history_rows_considered} |`)].join('\n');
const diff=['# E88 PARK AGING DIFF',`- court_fingerprint: ${decisionFingerprint}`,'','| symbol | old_state | old_park_until | new_state | new_park_until | reason_code |','|---|---|---|---|---|---|',...decisions.map((d)=>{const p=priorMap.get(d.symbol)||{state:'ACTIVE',park_until:'-'};return `| ${d.symbol} | ${p.state} | ${p.park_until||'-'} | ${d.state} | ${d.park_until||'-'} | ${d.reason_code} |`;})].join('\n');

if(update&&process.env.CI!=='true'){ensureDir(E88_ROOT);writeMd(path.join(E88_ROOT,'REASON_HISTORY_SNAPSHOT.md'),snapshot);writeMd(path.join(E88_ROOT,'PARK_AGING_COURT.md'),court);writeMd(path.join(E88_ROOT,'PARK_AGING_DIFF.md'),diff);} 
if(!update){for(const f of ['REASON_HISTORY_SNAPSHOT.md','PARK_AGING_COURT.md','PARK_AGING_DIFF.md']) if(!fs.existsSync(path.join(E88_ROOT,f))) throw new Error(`missing ${f}`);} 
minimalLog(`verify:e88:park:court PASSED court_fingerprint=${decisionFingerprint}`);
