#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { E87_ROOT, E87_DISABLELIST_POLICY, ensureDir, minimalLog } from './e87_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E87_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E87_EVIDENCE forbidden in CI');
const pol=fs.readFileSync(E87_DISABLELIST_POLICY,'utf8');
function s(k,d){return Number((pol.match(new RegExp(`- ${k}:\\s*([0-9.]+)`))||[])[1]??d);} 
const parkDays=s('PARK_DAYS',7),holdStrictDays=s('HOLD_STRICT_THRESHOLD_DAYS',5);
const canary=fs.readFileSync(path.resolve('reports/evidence/E86/RUNS_EDGE_CANARY_X2.md'),'utf8');
const rows=[...canary.matchAll(/^\|\s([^|]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|/gm)]
  .map((m)=>({symbol:m[1].trim(),stage:m[2].trim(),promotion:m[3].trim(),reasons:m[4].trim()}))
  .filter((r)=>r.symbol!=='symbol')
  .sort((a,b)=>a.symbol.localeCompare(b.symbol));
const actions=rows.map((r)=>{let state='ACTIVE',reason_code='NONE';if(r.promotion==='FAIL'&&r.reasons.includes('SPREAD_GT_MAX')){state='PARK';reason_code='REJECT_ALL_REPEAT';}if(r.promotion==='FAIL'&&r.reasons.includes('WINDOWS_LT_MIN')){state='PARK';reason_code='HOLD_STRICT_PERSIST';}return {symbol:r.symbol,state,park_days:state==='PARK'?parkDays:0,reason_code,support_fingerprint:(canary.match(/run1_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||''};});
const fp=crypto.createHash('sha256').update(JSON.stringify(actions)).digest('hex');
if(update&&process.env.CI!=='true'){
  ensureDir(E87_ROOT);
  writeMd(path.join(E87_ROOT,'DISABLELIST_COURT.md'),['# E87 DISABLELIST COURT',`- status: PASS`,`- disablelist_policy_hash: ${crypto.createHash('sha256').update(pol).digest('hex')}`,`- hold_strict_threshold_days: ${holdStrictDays}`,`- disablelist_court_fingerprint: ${fp}`,'','| symbol | state | park_days | reason_code | support_fingerprint |','|---|---|---:|---|---|',...actions.map((a)=>`| ${a.symbol} | ${a.state} | ${a.park_days} | ${a.reason_code} | ${a.support_fingerprint} |`)].join('\n'));
}
minimalLog(`verify:e87:disablelist:court PASSED disablelist_court_fingerprint=${fp}`);
