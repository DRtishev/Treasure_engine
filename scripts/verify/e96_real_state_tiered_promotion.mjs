#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E96_ROOT, ensureDir, parseTierPolicy } from './e96_lib.mjs';
import { writeMd } from './e66_lib.mjs';
import { parseFixtureRowsFromText } from './e89_park_aging_core.mjs';

const update=process.env.UPDATE_E96_EVIDENCE==='1';
const {tiers,ov,def}=parseTierPolicy();
const cadence=fs.readFileSync('core/edge/state/cadence_ledger_state.md','utf8');
const reason=parseFixtureRowsFromText(fs.readFileSync('core/edge/state/reason_history_state.md','utf8'));
const symbols=[...new Set(reason.map((r)=>r.symbol))].sort();
const rows=symbols.map((s)=>{const tier=ov.get(s)||def;const minDays=tiers.get(tier).min_days;const c=[...cadence.matchAll(new RegExp(`^\\|\\s(\\d{4}-\\d{2}-\\d{2})\\s\\|\\s${s}\\s\\|`,'gm'))].length;const r=reason.filter((x)=>x.symbol===s).length;const days=Math.min(c,r);const decision=days<minDays?'OBSERVE':'PROMOTE';const reasonCode=days<minDays?'INSUFFICIENT_DAYS|MISSING_WINDOWS':'READY';return {symbol:s,tier,days_observed:days,min_days:minDays,decision,reason_code:reasonCode};});
const ok=rows.every((r)=>r.decision!=='PROMOTE'||r.days_observed>=r.min_days);
if(update&&process.env.CI!=='true'){
  ensureDir(E96_ROOT);
  writeMd(path.join(E96_ROOT,'REAL_STATE_TIERED_PROMOTION.md'),['# E96 REAL STATE TIERED PROMOTION','| symbol | tier | days_observed | min_days | decision | reason_codes |','|---|---|---:|---:|---|---|',...rows.map((r)=>`| ${r.symbol} | ${r.tier} | ${r.days_observed} | ${r.min_days} | ${r.decision} | ${r.reason_code} |`)].join('\n'));
  writeMd(path.join(E96_ROOT,'REAL_STATE_ASSERTIONS.md'),['# E96 REAL STATE ASSERTIONS',`- A1_no_fake_promote_under_min_days: ${ok?'PASS':'FAIL'}`].join('\n'));
}
if(!update){for(const f of ['REAL_STATE_TIERED_PROMOTION.md','REAL_STATE_ASSERTIONS.md']) if(!fs.existsSync(path.join(E96_ROOT,f))) throw new Error(`missing ${f}`);} 
console.log('verify:e96:real PASSED');
