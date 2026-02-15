#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E83_ROOT, E83_POLICY, ensureDir, quietLog, minimalLog } from './e83_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E83_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E83_EVIDENCE forbidden in CI');
function scalar(raw,k,d){return Number((raw.match(new RegExp(`- ${k}:\\s*([0-9.]+)`))||[])[1]??d);}
const pRaw=fs.readFileSync(E83_POLICY,'utf8');
const minConsec=Math.max(1,scalar(pRaw,'MIN_CONSECUTIVE_STRICT',2));
const N=Math.max(1,Number(process.env.READINESS_N||'5'));

const runFiles=[];
for(const epochDir of fs.readdirSync('reports/evidence').filter((d)=>/^E\d+$/.test(d)).sort((a,b)=>Number(a.slice(1))-Number(b.slice(1)))){
  const p=path.join('reports/evidence',epochDir,'RUNS_EDGE_CANARY_X2.md');
  if(fs.existsSync(p)) runFiles.push(p);
}
const recent=runFiles.slice(-N);
const bySym=new Map();
for(const f of recent){
  const raw=fs.readFileSync(f,'utf8');
  for(const m of raw.matchAll(/^-\s([A-Z0-9]+):\s(PASS|FAIL)(?:\s\(([^)]*)\))?/gm)){
    const arr=bySym.get(m[1])||[];arr.push({status:m[2],reasons:m[3]||''});bySym.set(m[1],arr);
  }
}
const rows=[...bySym.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([symbol,arr])=>{
  let consec=0;for(let i=arr.length-1;i>=0;i--){if(arr[i].status==='PASS') consec++;else break;}
  const readiness=consec>=minConsec?'READY_STRICT_1':'NOT_READY';
  const reasons=arr.length?arr[arr.length-1].reasons||'NONE':'NO_HISTORY';
  return {symbol,samples:arr.length,trend:arr.map((x)=>x.status[0]).join(''),consecutive_pass:consec,required_consecutive:minConsec,readiness,last_reason_codes:reasons};
});

if(update&&process.env.CI!=='true'){
  ensureDir(E83_ROOT);
  const lines=['# E83 READINESS TREND',`- lookback_runs: ${recent.length}`,`- required_consecutive_pass: ${minConsec}`,'','| symbol | samples | trend | consecutive_pass | required_consecutive | readiness | last_reason_codes |','|---|---:|---|---:|---:|---|---|'];
  for(const r of rows) lines.push(`| ${r.symbol} | ${r.samples} | ${r.trend} | ${r.consecutive_pass} | ${r.required_consecutive} | ${r.readiness} | ${r.last_reason_codes} |`);
  writeMd(path.join(E83_ROOT,'READINESS_TREND.md'),lines.join('\n'));
}
quietLog(JSON.stringify({symbols:rows.length,lookback:recent.length},null,2));
minimalLog('verify:e83:readiness PASSED');
