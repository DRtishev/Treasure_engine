#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { runE78ProfitSearch } from '../../core/edge/e78_profit_search.mjs';
import { E79_ROOT, ensureDir, quietLog, minimalLog } from './e79_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E79_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E79_EVIDENCE forbidden in CI');

const kFamily=Number(process.env.E79_TOPK_FAMILY||1);
const kOverall=Number(process.env.E79_TOPK_OVERALL||3);
const deny=new Set(['NOT_ROBUST','LOT_CONSTRAINT_FAIL','MIN_NOTIONAL_FAIL','LOOKAHEAD_SUSPECT']);

const ps=runE78ProfitSearch({seed:Number(process.env.SEED||'12345')});
const ok=ps.candidates.filter((c)=>!deny.has(c.reason_code));
const famMap=new Map();
for(const c of ok){if(!famMap.has(c.family)) famMap.set(c.family,[]); famMap.get(c.family).push(c);}
for(const arr of famMap.values()) arr.sort((a,b)=>b.robust_score-a.robust_score||b.metrics.WORST.net_pnl-a.metrics.WORST.net_pnl||a.candidate_id.localeCompare(b.candidate_id));
const perFamily=[...famMap.values()].flatMap((arr)=>arr.slice(0,kFamily));
const overall=[...ok].sort((a,b)=>b.robust_score-a.robust_score||b.metrics.WORST.net_pnl-a.metrics.WORST.net_pnl||a.candidate_id.localeCompare(b.candidate_id)).slice(0,kOverall);
const merged=new Map();
for(const c of [...perFamily,...overall]) merged.set(c.candidate_id,c);
const shortlist=[...merged.values()].sort((a,b)=>b.robust_score-a.robust_score||b.metrics.WORST.net_pnl-a.metrics.WORST.net_pnl||a.candidate_id.localeCompare(b.candidate_id));
const rows=shortlist.map((c)=>({symbol:'MULTI',family:c.family,candidate:c.candidate_id,params_hash:crypto.createHash('sha256').update(JSON.stringify(c)).digest('hex'),robustness:c.robust_score,promotion_state:c.robust_score>0.4?'PROMOTED_TO_CANARY':'HOLD',reason_code:c.robust_score>0.4?'ROBUST':'LOW_ROBUSTNESS'}));
const shortlist_fingerprint=crypto.createHash('sha256').update(JSON.stringify(rows.map((r)=>[r.symbol,r.family,r.candidate,r.params_hash,r.robustness,r.promotion_state,r.reason_code]))).digest('hex');

if(update&&process.env.CI!=='true'){
  ensureDir(E79_ROOT);
  const lines=['# E79 EDGE SHORTLIST',`- shortlist_fingerprint: ${shortlist_fingerprint}`,'| symbol | family | candidate | params_hash | robustness | promotion_state | reason_code |','|---|---|---|---|---:|---|---|'];
  for(const r of rows) lines.push(`| ${r.symbol} | ${r.family} | ${r.candidate} | ${r.params_hash.slice(0,12)}... | ${r.robustness} | ${r.promotion_state} | ${r.reason_code} |`);
  writeMd(path.join(E79_ROOT,'EDGE_SHORTLIST.md'),lines.join('\n'));
}
quietLog(JSON.stringify({shortlist_fingerprint,count:rows.length},null,2));
minimalLog(`verify:edge:shortlist PASSED shortlist_fingerprint=${shortlist_fingerprint}`);
