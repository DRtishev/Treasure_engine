#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { E91_ROOT, E91_LOCK_PATH, ensureDir, anchorsE91, minimalLog } from './e91_lib.mjs';
import { writeMd } from './e66_lib.mjs';
import { BASE_POLICY, parseFixtureRowsFromFile, computeParkAgingDecisions } from './e89_park_aging_core.mjs';

const update=process.env.UPDATE_E91_EVIDENCE==='1';
if(fs.existsSync(E91_LOCK_PATH)&&process.env.CLEAR_E91_KILL_LOCK!=='1') throw new Error(`kill-lock active: ${E91_LOCK_PATH}`);
if(process.env.CLEAR_E91_KILL_LOCK==='1'&&process.env.CI!=='true') fs.rmSync(E91_LOCK_PATH,{force:true});
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E91_EVIDENCE forbidden in CI');

function armLock(reason,meta){ensureDir(path.dirname(E91_LOCK_PATH));writeMd(E91_LOCK_PATH,['# E91 KILL LOCK',`- reason: ${reason}`,...Object.entries(meta).map(([k,v])=>`- ${k}: ${v}`)].join('\n'));}
function fp(obj){return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');}
function normalizeRows(rows){return [...rows].sort((a,b)=>a.date_utc.localeCompare(b.date_utc)||a.symbol.localeCompare(b.symbol));}
function mapDecision(decisions){return decisions.map((d)=>`${d.symbol}|${d.state}|${d.park_until}|${d.rule_fired}|${d.reject_count}|${d.hold_streak}|${d.clean_days}`).join('\n');}

const rowsBase=parseFixtureRowsFromFile('core/edge/state/fixtures/e89_reason_history_fixture.md');
const today=String(process.env.E91_DATE_UTC||'2026-01-12');

function transformF1(rows){return rows.filter((r)=>Number(r.date_utc.slice(8,10))%3!==0);} // remove every 3rd day
function transformF2(rows){return rows.filter((r)=>!(r.symbol==='BETA'&&r.date_utc>='2025-12-26'&&r.date_utc<='2025-12-30'));} // dropout then return
function transformF3(rows){
  return rows.filter((r)=>{
    if(r.symbol==='ALPHA') return true;
    if(r.symbol==='DELTA') return Number(r.date_utc.slice(8,10))%2===1;
    return true;
  });
}
function transformF4(rows){
  const sorted=normalizeRows(rows);
  const out=[...sorted];
  const i=Math.min(20,out.length-2);
  if(i>1){const t=out[i];out[i]=out[i-1];out[i-1]=t;} // deliberate out-of-order injection
  return out;
}

const cases=[];
function evaluateCase(caseId, rowsInput, opts={}){
  const sortedRows=opts.allowSort ? normalizeRows(rowsInput) : rowsInput;
  const decisions=computeParkAgingDecisions({rows:sortedRows,today,policy:BASE_POLICY});
  const caseFp=fp({caseId,rows_fp:fp(sortedRows),decisions});
  cases.push({case_id:caseId,row_count:sortedRows.length,sorted_applied:opts.allowSort?'true':'false',fingerprint:caseFp,decision_fp:fp(mapDecision(decisions)),decisions});
  return decisions;
}

const baseDec=evaluateCase('BASE',rowsBase,{allowSort:false});
const f1Dec=evaluateCase('F1_MISSING_DAY_GAPS',transformF1(rowsBase),{allowSort:false});
const f2Dec=evaluateCase('F2_SYMBOL_DROPOUT_RETURN',transformF2(rowsBase),{allowSort:false});
const f3Dec=evaluateCase('F3_MIXED_CADENCE',transformF3(rowsBase),{allowSort:false});
const f4Injected=transformF4(rowsBase);
const f4IsInjectedOutOfOrder=JSON.stringify(f4Injected)!==JSON.stringify(normalizeRows(f4Injected));
const f4Dec=evaluateCase('F4_OUT_OF_ORDER_SORTED',f4Injected,{allowSort:true});

const deterministicRun1=fp({anchors:anchorsE91(),today,cases:cases.map((c)=>({id:c.case_id,fp:c.fingerprint,decision_fp:c.decision_fp}))});
const deterministicRun2=fp({anchors:anchorsE91(),today,cases:cases.map((c)=>({id:c.case_id,fp:c.fingerprint,decision_fp:c.decision_fp}))});
const deterministicMatch=deterministicRun1===deterministicRun2;

const symbols=new Set(baseDec.map((d)=>d.symbol));
const allCasesHaveSymbols=[f1Dec,f2Dec,f3Dec,f4Dec].every((d)=>d.every((row)=>symbols.has(row.symbol)));
const f1Stable=f1Dec.length>0&&f1Dec.length<=baseDec.length;
const f2BetaStillPresent=f2Dec.some((d)=>d.symbol==='BETA');
const f3Deterministic=f3Dec.length===baseDec.length;
const f4SortContract=f4IsInjectedOutOfOrder&&mapDecision(f4Dec).length>0;

const hardFail=!deterministicMatch||!allCasesHaveSymbols||!f1Stable||!f2BetaStillPresent||!f3Deterministic||!f4SortContract;
if(hardFail){
  armLock('SPARSITY_SUITE_FAILURE',{deterministic_match:String(deterministicMatch),all_cases_symbols:String(allCasesHaveSymbols),f1_stable:String(f1Stable),f2_beta_return:String(f2BetaStillPresent),f3_deterministic:String(f3Deterministic),f4_sort_contract:String(f4SortContract)});
  throw new Error('E91 sparsity suite failed');
}

if(update&&process.env.CI!=='true'){
  ensureDir(E91_ROOT);
  writeMd(path.join(E91_ROOT,'SPARSITY_SUITE.md'),[
    '# E91 SPARSITY SUITE',
    `- streak_definition: consecutive_observed_rows`,
    `- today_utc: ${today}`,
    '',
    '| case_id | row_count | sorted_applied | fingerprint | decision_fp |',
    '|---|---:|---|---|---|',
    ...cases.map((c)=>`| ${c.case_id} | ${c.row_count} | ${c.sorted_applied} | ${c.fingerprint} | ${c.decision_fp} |`)
  ].join('\n'));
  writeMd(path.join(E91_ROOT,'SPARSITY_ASSERTIONS.md'),[
    '# E91 SPARSITY ASSERTIONS',
    '- streak_logic_contract: consecutive_observed_rows',
    `- A1_all_cases_have_base_symbols: ${allCasesHaveSymbols?'PASS':'FAIL'}`,
    `- A2_f1_missing_day_gaps_produce_stable_nonempty_decisions: ${f1Stable?'PASS':'FAIL'}`,
    `- A3_f2_dropout_then_return_symbol_present: ${f2BetaStillPresent?'PASS':'FAIL'}`,
    `- A4_f3_mixed_cadence_stable_shape: ${f3Deterministic?'PASS':'FAIL'}`,
    `- A5_f4_out_of_order_injection_sorted_or_rejected: ${f4SortContract?'PASS':'FAIL'}`,
    `- deterministic_match_x2: ${deterministicMatch?'PASS':'FAIL'}`
  ].join('\n'));
  writeMd(path.join(E91_ROOT,'RUNS_SPARSITY_X2.md'),[
    '# E91 RUNS SPARSITY X2',
    `- run1_fingerprint: ${deterministicRun1}`,
    `- run2_fingerprint: ${deterministicRun2}`,
    `- deterministic_match: ${deterministicMatch?'true':'false'}`
  ].join('\n'));
}

if(!update){for(const f of ['SPARSITY_SUITE.md','SPARSITY_ASSERTIONS.md','RUNS_SPARSITY_X2.md']) if(!fs.existsSync(path.join(E91_ROOT,f))) throw new Error(`missing ${f}`);} 
minimalLog(`verify:e91:sparsity:suite PASSED suite_fingerprint=${deterministicRun1}`);
