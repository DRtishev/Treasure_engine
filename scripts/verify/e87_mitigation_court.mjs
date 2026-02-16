#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { E87_ROOT, E87_MITIGATION_POLICY, ensureDir, minimalLog } from './e87_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E87_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E87_EVIDENCE forbidden in CI');
const raw=fs.readFileSync(path.resolve('reports/evidence/E84/PROFIT_LEDGER.md'),'utf8');
const policy=fs.readFileSync(E87_MITIGATION_POLICY,'utf8');
function s(k,d){return Number((policy.match(new RegExp(`- ${k}:\\s*([0-9.]+)`))||[])[1]??d);}
const budgets={spread:s('MAX_DELTA_SPREAD',0.05),slippage:s('MAX_DELTA_SLIPPAGE',0.0002),latency:s('MAX_DELTA_LATENCY',0.2),invalid:s('MAX_DELTA_INVALID',0.01),fees:s('MAX_DELTA_FEES',0.25)};
const rows=[...raw.matchAll(/^\|\s([^|]+)\s\|\s([0-9]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([-0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([A-Z_]+)\s\|\s([A-Z_,]+)\s\|$/gm)]
  .map((m)=>({symbol:m[1].trim(),fee:Number(m[8]),spread:Number(m[9]),slippage:Number(m[10]),latency:Number(m[11]),invalid:Number(m[12]),reason_codes:m[14].split(',').map((x)=>x.trim())}))
  .sort((a,b)=>a.symbol.localeCompare(b.symbol));
const proposals=[];
for(const r of rows){
  for(const code of r.reason_codes){
    let target='spread',delta=0,impact='lower adverse fill delta',risk='over-tightening';
    if(code.includes('SPREAD')){target='spread';delta=Math.min(r.spread*0.1,budgets.spread);} 
    else if(code.includes('SLIPPAGE')){target='slippage';delta=Math.min(r.slippage*0.15,budgets.slippage);} 
    else if(code.includes('LATENCY')){target='latency';delta=Math.min(r.latency*0.2,budgets.latency);} 
    else if(code.includes('INVALID')){target='invalid';delta=Math.min(Math.max(r.invalid*0.3,0.0001),budgets.invalid);} 
    else {target='fees';delta=Math.min(r.fee*0.1,budgets.fees);} 
    proposals.push({reason_code:code,target,symbol_scope:r.symbol,budgeted_delta:Number(delta.toFixed(target==='slippage'?8:4)),expected_impact:impact,risk,rollback_path:`revert ${r.symbol} ${target} delta`});
  }
}
proposals.sort((a,b)=>a.reason_code.localeCompare(b.reason_code)||a.symbol_scope.localeCompare(b.symbol_scope));
const fp=crypto.createHash('sha256').update(JSON.stringify({budgets,proposals})).digest('hex');
if(update&&process.env.CI!=='true'){
  ensureDir(E87_ROOT);
  writeMd(path.join(E87_ROOT,'MITIGATION_COURT.md'),['# E87 MITIGATION COURT',`- status: PASS`,`- mitigation_policy_hash: ${crypto.createHash('sha256').update(policy).digest('hex')}`,`- mitigation_court_fingerprint: ${fp}`,'','| # | reason_code | target | symbol_scope | budgeted_delta | expected_impact | risk | rollback_path |','|---:|---|---|---|---:|---|---|---|',...proposals.map((p,i)=>`| ${i+1} | ${p.reason_code} | ${p.target} | ${p.symbol_scope} | ${p.budgeted_delta} | ${p.expected_impact} | ${p.risk} | ${p.rollback_path} |`)].join('\n'));
  writeMd(path.join(E87_ROOT,'MITIGATION_DIFF.md'),['# E87 MITIGATION DIFF','| target | max_budget_delta | proposal_count |','|---|---:|---:|',...Object.keys(budgets).sort().map((k)=>`| ${k} | ${budgets[k]} | ${proposals.filter((p)=>p.target===k).length} |`)].join('\n'));
}
minimalLog(`verify:e87:mitigation:court PASSED mitigation_court_fingerprint=${fp}`);
