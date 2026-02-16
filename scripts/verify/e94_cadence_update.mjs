#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { CADENCE_PATH, ensureDir, parseCadenceRows, minimalLog } from './e94_lib.mjs';
import { writeMd, sha256File } from './e66_lib.mjs';
import { parseFixtureRowsFromText } from './e89_park_aging_core.mjs';

const updateState=process.env.UPDATE_E94_STATE==='1';
if(process.env.CI==='true'&&updateState) throw new Error('UPDATE_E94_STATE forbidden in CI');
if(!updateState){minimalLog('verify:e94:cadence:update SKIPPED update_state=0');process.exit(0);} 

const reasonPath='core/edge/state/reason_history_state.md';
const reasonText=fs.readFileSync(reasonPath,'utf8');
const rows=parseFixtureRowsFromText(reasonText).sort((a,b)=>a.date_utc.localeCompare(b.date_utc)||a.symbol.localeCompare(b.symbol));
const endUtc=rows[rows.length-1].date_utc;
const endDay=Math.floor(Date.UTC(Number(endUtc.slice(0,4)),Number(endUtc.slice(5,7))-1,Number(endUtc.slice(8,10)))/86400000);
const symbols=[...new Set(rows.map((r)=>r.symbol))].sort();
const existing=parseCadenceRows();
const key=(r)=>`${r.date_utc}|${r.symbol}`;
const map=new Map(existing.map((r)=>[key(r),r]));
const sentinel=fs.existsSync('reports/evidence/E87/MICROFILL_INPUT.md')?`SHA256:${sha256File(path.resolve('reports/evidence/E87/MICROFILL_INPUT.md'))}`:'ABSENT';
const anchor=sha256File(path.resolve(reasonPath));
for(let d=endDay-29; d<=endDay; d++){
  const date=new Date(d*86400000).toISOString().slice(0,10);
  for(const s of symbols){
    const notes=crypto.createHash('sha256').update(`${date}|${s}|${sentinel}`).digest('hex');
    map.set(`${date}|${s}`,{date_utc:date,symbol:s,sentinel,windows:'7/14/30',notes_digest:notes,anchors_digest:anchor});
  }
}
const out=[...map.values()].sort((a,b)=>a.date_utc.localeCompare(b.date_utc)||a.symbol.localeCompare(b.symbol));
ensureDir(path.dirname(CADENCE_PATH));
writeMd(CADENCE_PATH,['# E94 Cadence Ledger State','', '| date_utc | symbol | sentinel | windows | notes_digest | anchors_digest |','|---|---|---|---|---|---|',...out.map((r)=>`| ${r.date_utc} | ${r.symbol} | ${r.sentinel} | ${r.windows} | ${r.notes_digest} | ${r.anchors_digest} |`)].join('\n'));
minimalLog(`verify:e94:cadence:update PASSED cadence_rows=${out.length}`);
