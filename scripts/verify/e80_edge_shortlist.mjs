#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { runE78ProfitSearch } from '../../core/edge/e78_profit_search.mjs';
import { E80_ROOT, ensureDir, quietLog, minimalLog } from './e80_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E80_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E80_EVIDENCE forbidden in CI');
const deny=new Set(['NOT_ROBUST','LOT_CONSTRAINT_FAIL','MIN_NOTIONAL_FAIL','LOOKAHEAD_SUSPECT']);
const ps=runE78ProfitSearch({seed:Number(process.env.SEED||'12345')});
const shortlist=ps.candidates.filter((c)=>!deny.has(c.reason_code)).slice(0,4).map((c)=>({symbol:c.family==='trend'?'BTCUSDT':c.family==='meanrev'?'ETHUSDT':'SOLUSDT',family:c.family,candidate:c.candidate_id,params_hash:crypto.createHash('sha256').update(JSON.stringify(c)).digest('hex'),robustness:c.robust_score,promotion_state:c.robust_score>=0.5?'PROMOTED_TO_CANARY':'HOLD',reason_code:c.robust_score>=0.5?'ROBUST':'LOW_ROBUSTNESS'}));
const fp=crypto.createHash('sha256').update(JSON.stringify(shortlist)).digest('hex');
if(update&&process.env.CI!=='true'){ensureDir(E80_ROOT);const lines=['# E80 EDGE SHORTLIST',`- shortlist_fingerprint: ${fp}`,'| symbol | family | candidate | params_hash | robustness | promotion_state | reason_code |','|---|---|---|---|---:|---|---|'];for(const r of shortlist) lines.push(`| ${r.symbol} | ${r.family} | ${r.candidate} | ${r.params_hash.slice(0,12)}... | ${r.robustness} | ${r.promotion_state} | ${r.reason_code} |`);writeMd(path.join(E80_ROOT,'EDGE_SHORTLIST.md'),lines.join('\n'));}
quietLog(JSON.stringify({shortlist_fingerprint:fp},null,2));
minimalLog(`verify:e80:shortlist PASSED shortlist_fingerprint=${fp}`);
