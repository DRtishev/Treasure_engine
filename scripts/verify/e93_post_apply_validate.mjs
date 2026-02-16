#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { E93_ROOT, E93_LOCK_PATH, ensureDir, fmt4, minimalLog } from './e93_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E93_EVIDENCE==='1';
if(fs.existsSync(E93_LOCK_PATH)&&process.env.CLEAR_E93_KILL_LOCK!=='1') throw new Error(`kill-lock active: ${E93_LOCK_PATH}`);
if(process.env.CLEAR_E93_KILL_LOCK==='1'&&process.env.CI!=='true') fs.rmSync(E93_LOCK_PATH,{force:true});
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E93_EVIDENCE forbidden in CI');

function arm(reason,meta){ensureDir(path.dirname(E93_LOCK_PATH));writeMd(E93_LOCK_PATH,['# E93 KILL LOCK',`- reason: ${reason}`,...Object.entries(meta).map(([k,v])=>`- ${k}: ${v}`)].join('\n'));}
function parseNum(v){const n=Number(v);return Number.isFinite(n)?n:0;}

const court='reports/evidence/E92/EV_DELTA_COURT.md';
const diff='reports/evidence/E92/EV_DELTA_DIFF.md';
if(!fs.existsSync(court)||!fs.existsSync(diff)) throw new Error('missing E92 court/diff evidence');
const c=fs.readFileSync(court,'utf8');
const d=fs.readFileSync(diff,'utf8');

const metrics=[...c.matchAll(/^\|\s([^|]+)\s\|\s([0-9]+)\s\|\s([0-9]+)\s\|\s([0-9]+)\s\|\s([0-9]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([-0-9.]+)\s\|$/gm)].map((m)=>({symbol:m[1].trim(),reject_rate:parseNum(m[6]),hold_rate:parseNum(m[7]),park_rate:parseNum(m[8]),ev_score:parseNum(m[15])})).sort((a,b)=>a.symbol.localeCompare(b.symbol));
const proposals=[...d.matchAll(/^\|\s(P_[^|]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([0-9]+)\s\|\s([^|]+)\s\|\s([-0-9.]+)\s\|\s([-0-9.]+)\s\|\s([-0-9.]+)\s\|\s([-0-9.]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|$/gm)].map((m)=>({proposal_id:m[1].trim(),symbol:m[2].trim(),step:parseNum(m[4]),ev_delta:parseNum(m[9])})).sort((a,b)=>a.symbol.localeCompare(b.symbol)||a.proposal_id.localeCompare(b.proposal_id));

const maxSymbols=3, stepCap=1, tolerance=0.0000;
const symbolsChanged=[...new Set(proposals.map((p)=>p.symbol))].sort();
const capsOk=proposals.every((p)=>p.step<=stepCap)&&symbolsChanged.length<=maxSymbols;

const rows=metrics.map((m)=>{const p=proposals.filter((x)=>x.symbol===m.symbol);const beforeRisk=m.reject_rate+m.hold_rate+m.park_rate;const afterRisk=Math.max(0,beforeRisk-p.reduce((a,b)=>a+Math.max(0,b.ev_delta),0));return {symbol:m.symbol,before_risk:beforeRisk,after_risk:afterRisk,delta:afterRisk-beforeRisk,no_worse:afterRisk<=beforeRisk+tolerance?'PASS':'FAIL'};});
const noWorse=rows.every((r)=>r.no_worse==='PASS');
const fp=crypto.createHash('sha256').update(JSON.stringify({rows,proposals})).digest('hex');

if(!capsOk||!noWorse){arm('POST_APPLY_CONTRACT_FAILURE',{caps_ok:String(capsOk),no_worse:String(noWorse)});throw new Error('E93 post-apply validation failed');}

if(update&&process.env.CI!=='true'){
  ensureDir(E93_ROOT);
  writeMd(path.join(E93_ROOT,'POST_APPLY_VALIDATE.md'),['# E93 POST APPLY VALIDATE',`- budget_symbols_cap: ${maxSymbols}`,`- budget_step_cap: ${stepCap}`,`- no_worse_tolerance: ${fmt4(tolerance)}`,'','| symbol | before_risk_proxy | after_risk_proxy | risk_delta | no_worse |','|---|---:|---:|---:|---|',...rows.map((r)=>`| ${r.symbol} | ${fmt4(r.before_risk)} | ${fmt4(r.after_risk)} | ${fmt4(r.delta)} | ${r.no_worse} |`),`- post_apply_fingerprint: ${fp}`].join('\n'));
  writeMd(path.join(E93_ROOT,'POST_APPLY_ASSERTIONS.md'),['# E93 POST APPLY ASSERTIONS',`- A1_caps_respected: ${capsOk?'PASS':'FAIL'}`,`- A2_no_worse_risk_proxy: ${noWorse?'PASS':'FAIL'}`,`- changed_symbol_count: ${symbolsChanged.length}`,`- proposal_count: ${proposals.length}`].join('\n'));
}
if(!update){for(const f of ['POST_APPLY_VALIDATE.md','POST_APPLY_ASSERTIONS.md']) if(!fs.existsSync(path.join(E93_ROOT,f))) throw new Error(`missing ${f}`);} 
minimalLog(`verify:e93:post:apply PASSED post_apply_fingerprint=${fp}`);
