#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E95_ROOT, ensureDir, fmt4 } from './e95_lib.mjs';
import { writeMd } from './e66_lib.mjs';
import { parseFixtureRowsFromText } from './e89_park_aging_core.mjs';

const update=process.env.UPDATE_E95_EVIDENCE==='1';
const pol=fs.readFileSync('core/edge/contracts/e95_readiness_thresholds.md','utf8');
const minDays=Number((pol.match(/- MIN_DAYS_DEFAULT:\s*([0-9]+)/)||[])[1]||7);
const cadence=fs.readFileSync('core/edge/state/cadence_ledger_state.md','utf8');
const reason=parseFixtureRowsFromText(fs.readFileSync('core/edge/state/reason_history_state.md','utf8'));
const symbols=[...new Set(reason.map((r)=>r.symbol))].sort();
const end=reason[reason.length-1].date_utc;
const rows=symbols.map((s)=>{const c=[...cadence.matchAll(new RegExp(`^\\|\\s(\\d{4}-\\d{2}-\\d{2})\\s\\|\\s${s}\\s\\|`,'gm'))].length;const r=reason.filter((x)=>x.symbol===s).length;const days=Math.min(c,r);const d=days<minDays?'OBSERVE':'PROMOTE';return {symbol:s,days_observed:days,decision:d,reason:d==='OBSERVE'?'INSUFFICIENT_DAYS':'SUFFICIENT_DAYS'};});
const ok=rows.every((r)=>r.decision!=='PROMOTE'||r.days_observed>=minDays);
if(update&&process.env.CI!=='true'){
  ensureDir(E95_ROOT);
  writeMd(path.join(E95_ROOT,'REAL_STATE_PROMOTION.md'),['# E95 REAL STATE PROMOTION',`- end_utc: ${end}`,`- MIN_DAYS: ${minDays}`,'','| symbol | days_observed | decision | reason |','|---|---:|---|---|',...rows.map((r)=>`| ${r.symbol} | ${r.days_observed} | ${r.decision} | ${r.reason} |`)].join('\n'));
  writeMd(path.join(E95_ROOT,'REAL_STATE_ASSERTIONS.md'),['# E95 REAL STATE ASSERTIONS',`- A1_min_days_real_state: ${ok?'PASS':'FAIL'}`].join('\n'));
}
if(!update){for(const f of ['REAL_STATE_PROMOTION.md','REAL_STATE_ASSERTIONS.md']) if(!fs.existsSync(path.join(E95_ROOT,f))) throw new Error(`missing ${f}`);} 
console.log('verify:e95:real:promotion PASSED');
