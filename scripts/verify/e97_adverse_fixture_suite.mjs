#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256Text, writeMd } from './e66_lib.mjs';
import { E97_ADVERSE, E97_ROOT, computeTuningCourt, ensureDir } from './e97_lib.mjs';

function parseFixture(text){
  return [...text.matchAll(/^\|\s([^|]+)\s\|\s(\d{4}-\d{2}-\d{2})\s\|\s([^|]+)\s\|\s(-?[0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|$/gm)]
    .map((m)=>({case_id:m[1].trim(),date_utc:m[2],symbol:m[3].trim(),pnl_usd:Number(m[4]),latency_ms:Number(m[5]),spread_bps:Number(m[6]),fill_rate:Number(m[7]),expected_action:m[8].trim(),expected_reason:m[9].trim()}));
}

const fx=parseFixture(fs.readFileSync(E97_ADVERSE,'utf8'));
const run=(rows)=>{
  const res=computeTuningCourt(rows.map((r)=>({date_utc:r.date_utc,symbol:r.symbol,pnl_usd:r.pnl_usd,latency_ms:r.latency_ms,spread_bps:r.spread_bps,fill_rate:r.fill_rate})));
  const map=new Map(res.map((r)=>[r.symbol,r]));
  return rows.map((r)=>({
    case_id:r.case_id,
    symbol:r.symbol,
    expected_action:r.expected_action,
    expected_reason:r.expected_reason,
    got_action:map.get(r.symbol)?.action||'ABSENT',
    got_reason:map.get(r.symbol)?.reason||'ABSENT'
  }));
};

const r1=run(fx);
const r2=run(fx);
const fp1=sha256Text(JSON.stringify(r1));
const fp2=sha256Text(JSON.stringify(r2));
const deterministic=fp1===fp2;
if(!deterministic) throw new Error('determinism mismatch in adverse suite');
const passCount=r1.filter((r)=>r.expected_action===r.got_action&&r.expected_reason===r.got_reason).length;
if(passCount<5) throw new Error('adverse suite expected mappings < 5');

ensureDir(E97_ROOT);
writeMd(path.join(E97_ROOT,'ADVERSE_SUITE.md'),[
  '# E97 Adverse Fixture Suite',
  `- cases: ${fx.length}`,
  `- pass_cases: ${passCount}`,
  '| case_id | symbol | expected_action | got_action | expected_reason | got_reason |',
  '|---|---|---|---|---|---|',
  ...r1.map((r)=>`| ${r.case_id} | ${r.symbol} | ${r.expected_action} | ${r.got_action} | ${r.expected_reason} | ${r.got_reason} |`)
].join('\n'));

writeMd(path.join(E97_ROOT,'ADVERSE_ASSERTIONS.md'),[
  '# E97 Adverse Assertions',
  `- mapping_tighten: ${r1.some((r)=>r.expected_action==='TIGHTEN'&&r.got_action==='TIGHTEN')}`,
  `- mapping_loosen: ${r1.some((r)=>r.expected_action==='LOOSEN'&&r.got_action==='LOOSEN')}`,
  `- mapping_hold: ${r1.some((r)=>r.expected_action==='HOLD'&&r.got_action==='HOLD')}`,
  `- mapping_park: ${r1.some((r)=>r.expected_action==='PARK'&&r.got_action==='PARK')}`,
  `- mapping_insufficient_days_observe: ${r1.some((r)=>r.expected_reason==='INSUFFICIENT_DAYS'&&r.got_reason==='INSUFFICIENT_DAYS')}`,
  `- pass_cases_gte_5: ${passCount>=5}`
].join('\n'));

writeMd(path.join(E97_ROOT,'RUNS_TUNING_X2.md'),[
  '# E97 Court Determinism x2',
  `- run1_fingerprint: ${fp1}`,
  `- run2_fingerprint: ${fp2}`,
  `- deterministic_match: ${deterministic}`
].join('\n'));

console.log(`verify:e97:adverse PASSED pass_cases=${passCount}/${fx.length}`);
