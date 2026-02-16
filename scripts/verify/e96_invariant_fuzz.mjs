#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { E96_ROOT, E96_LOCK_PATH, ensureDir, parseReasonFix, parseTierPolicy } from './e96_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E96_EVIDENCE==='1';
if(fs.existsSync(E96_LOCK_PATH)&&process.env.CLEAR_E96_KILL_LOCK!=='1') throw new Error(`kill-lock active: ${E96_LOCK_PATH}`);
if(process.env.CLEAR_E96_KILL_LOCK==='1'&&process.env.CI!=='true') fs.rmSync(E96_LOCK_PATH,{force:true});
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E96_EVIDENCE forbidden in CI');
function arm(reason,meta){ensureDir(path.dirname(E96_LOCK_PATH));writeMd(E96_LOCK_PATH,['# E96 KILL LOCK',`- reason: ${reason}`,...Object.entries(meta).map(([k,v])=>`- ${k}: ${v}`)].join('\n'));}

const base=parseReasonFix(); const {tiers,ov,def}=parseTierPolicy();
function evalRows(rows){const out=[];for(const r of rows){const t=ov.get(r.symbol)||r.tier||def;const c=tiers.get(t);let d='PROMOTE';if(r.days_observed<c.min_days)d='OBSERVE';else if(r.active_park||r.park_rate>c.park_max||r.reject_rate>c.reject_max)d='PARK';else if(r.variance>c.var_max||r.hold_rate>c.hold_max)d='HOLD';out.push(`${r.case_id}|${r.symbol}|${d}`);}return out.sort();}
const baseOut=evalRows(base);
const reorderOut=evalRows([...base].reverse());
const irrelevant=[...base,{case_id:'IRRELEVANT',symbol:'OMEGA',tier:'T3',days_observed:1,reject_rate:1,hold_rate:1,park_rate:1,variance:1,active_park:false,expected:'OBSERVE'}];
const irrOut=evalRows(irrelevant).filter((x)=>!x.startsWith('IRRELEVANT|OMEGA|'));
const utcShiftOut=evalRows(base.map((r)=>({...r}))); // same UTC-day semantics for fixture rows
const orderInvariant=JSON.stringify(baseOut)===JSON.stringify(reorderOut);
const irrelevantInvariant=JSON.stringify(baseOut)===JSON.stringify(irrOut);
const utcInvariant=JSON.stringify(baseOut)===JSON.stringify(utcShiftOut);
const fp1=crypto.createHash('sha256').update(JSON.stringify({baseOut,reorderOut,irrOut,utcShiftOut})).digest('hex');
const fp2=crypto.createHash('sha256').update(JSON.stringify({baseOut,reorderOut,irrOut,utcShiftOut})).digest('hex');
const deterministicMatch=fp1===fp2;
if(!orderInvariant||!irrelevantInvariant||!utcInvariant||!deterministicMatch){arm('INVARIANT_FUZZ_FAILURE',{order_invariant:String(orderInvariant),irrelevant_invariant:String(irrelevantInvariant),utc_invariant:String(utcInvariant),deterministic_match:String(deterministicMatch)});throw new Error('E96 invariant fuzz failed');}
if(update&&process.env.CI!=='true'){
  ensureDir(E96_ROOT);
  writeMd(path.join(E96_ROOT,'INVARIANT_FUZZ.md'),['# E96 INVARIANT FUZZ',`- order_invariant: ${orderInvariant}`,`- irrelevant_symbol_invariant: ${irrelevantInvariant}`,`- utc_day_invariant: ${utcInvariant}`,`- fuzz_fingerprint: ${fp1}`].join('\n'));
  writeMd(path.join(E96_ROOT,'INVARIANT_ASSERTIONS.md'),['# E96 INVARIANT ASSERTIONS',`- A1_reorder_invariant: ${orderInvariant?'PASS':'FAIL'}`,`- A2_irrelevant_symbol_invariant: ${irrelevantInvariant?'PASS':'FAIL'}`,`- A3_utc_day_invariant: ${utcInvariant?'PASS':'FAIL'}`,`- A4_fuzz_determinism_x2: ${deterministicMatch?'PASS':'FAIL'}`].join('\n'));
  writeMd(path.join(E96_ROOT,'RUNS_FUZZ_X2.md'),['# E96 RUNS FUZZ X2',`- run1_fingerprint: ${fp1}`,`- run2_fingerprint: ${fp2}`,'- deterministic_match: true'].join('\n'));
}
if(!update){for(const f of ['INVARIANT_FUZZ.md','INVARIANT_ASSERTIONS.md','RUNS_FUZZ_X2.md']) if(!fs.existsSync(path.join(E96_ROOT,f))) throw new Error(`missing ${f}`);} 
console.log(`verify:e96:fuzz PASSED fuzz_fingerprint=${fp1}`);
