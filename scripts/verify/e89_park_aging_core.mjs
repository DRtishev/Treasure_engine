#!/usr/bin/env node
import fs from 'node:fs';

export const BASE_POLICY={window_days:7,reject_threshold:2,hold_streak_threshold:5,park_days:7,unpark_requires_clean_days:3,lookback_days:30};

export function toDay(s){return Math.floor(Date.UTC(Number(s.slice(0,4)),Number(s.slice(5,7))-1,Number(s.slice(8,10)))/86400000);}
export function fromDay(n){return new Date(n*86400000).toISOString().slice(0,10);}
export function addDays(s,n){return fromDay(toDay(s)+n);}

export function parseFixtureRowsFromText(text){
  return [...text.matchAll(/^\|\s(\d{4}-\d{2}-\d{2})\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([a-f0-9]{64})\s\|\s([a-f0-9]{64})\s\|$/gm)]
    .map((m)=>({date_utc:m[1],symbol:m[2].trim(),stage:m[3].trim(),verdict:m[4].trim(),reason_codes:m[5].trim()}));
}

export function parseFixtureRowsFromFile(filePath){return parseFixtureRowsFromText(fs.readFileSync(filePath,'utf8'));}

export function assertRowsOrdered(rows){
  const sorted=[...rows].sort((a,b)=>a.date_utc.localeCompare(b.date_utc)||a.symbol.localeCompare(b.symbol));
  if(JSON.stringify(rows)!==JSON.stringify(sorted)) throw new Error('fixture ordering violation');
}

export function shiftRows(rows,deltaDays){
  return rows.map((r)=>({ ...r, date_utc:addDays(r.date_utc,deltaDays), reason_codes:r.reason_codes.replace(/PARK_UNTIL_(\d{4}-\d{2}-\d{2})/g,(_,d)=>`PARK_UNTIL_${addDays(d,deltaDays)}`) }))
    .sort((a,b)=>a.date_utc.localeCompare(b.date_utc)||a.symbol.localeCompare(b.symbol));
}

export function computeParkAgingDecisions({rows,today,policy=BASE_POLICY}){
  const minDay=addDays(today,-policy.lookback_days+1);
  const symbols=[...new Set(rows.map((r)=>r.symbol))].sort();
  const decisions=[];
  for(const symbol of symbols){
    const h=rows.filter((r)=>r.symbol===symbol&&r.date_utc>=minDay).sort((a,b)=>a.date_utc.localeCompare(b.date_utc));
    const lastM=h.filter((r)=>r.date_utc>=addDays(today,-policy.window_days+1));
    const rejects=lastM.filter((r)=>r.verdict==='REJECT_ALL');
    let holdStreak=0;for(let i=h.length-1;i>=0;i--){if(h[i].verdict==='HOLD_STRICT') holdStreak++; else break;}
    const cleanRows=h.filter((r)=>r.date_utc>=addDays(today,-policy.unpark_requires_clean_days+1));
    const clean=cleanRows.length>=policy.unpark_requires_clean_days&&cleanRows.every((r)=>['ALLOW','BASELINE'].includes(r.verdict));
    const parkHints=h.flatMap((r)=>[...(r.reason_codes.match(/PARK_UNTIL_(\d{4}-\d{2}-\d{2})/g)||[])]).map((x)=>x.replace('PARK_UNTIL_','')).sort();
    const priorParkUntil=parkHints.length?parkHints[parkHints.length-1]:'';
    let state='ACTIVE',parkUntil='-',rule='R0_NO_ACTION';
    if(priorParkUntil&&priorParkUntil>=today){state='PARK';parkUntil=priorParkUntil;rule='R1_KEEP_PARK';}
    else if(rejects.length>=policy.reject_threshold){state='PARK';parkUntil=addDays(today,policy.park_days);rule='R2_REJECT_THRESHOLD';}
    else if(holdStreak>=policy.hold_streak_threshold){state='PARK';parkUntil=addDays(today,policy.park_days);rule='R3_HOLD_STREAK';}
    else if(priorParkUntil&&priorParkUntil<today&&clean){state='ACTIVE';parkUntil='-';rule='R4_UNPARK_CLEAN';}
    else if(priorParkUntil&&priorParkUntil<today){state='PARK';parkUntil='-';rule='R0_EXPIRED_PARK_NOT_CLEAN';}
    decisions.push({symbol,state,park_until:parkUntil,rule_fired:rule,reject_count:rejects.length,hold_streak:holdStreak,clean_days:cleanRows.length});
  }
  return decisions.sort((a,b)=>a.symbol.localeCompare(b.symbol));
}
