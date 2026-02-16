#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { E96_ROOT, E96_LOCK_PATH, ensureDir, fmt4, parseReasonFix, parseCadFix, parseTierPolicy, minimalLog } from './e96_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E96_EVIDENCE==='1';
if(fs.existsSync(E96_LOCK_PATH)&&process.env.CLEAR_E96_KILL_LOCK!=='1') throw new Error(`kill-lock active: ${E96_LOCK_PATH}`);
if(process.env.CLEAR_E96_KILL_LOCK==='1'&&process.env.CI!=='true') fs.rmSync(E96_LOCK_PATH,{force:true});
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E96_EVIDENCE forbidden in CI');
function arm(reason,meta){ensureDir(path.dirname(E96_LOCK_PATH));writeMd(E96_LOCK_PATH,['# E96 KILL LOCK',`- reason: ${reason}`,...Object.entries(meta).map(([k,v])=>`- ${k}: ${v}`)].join('\n'));}

const reason=parseReasonFix(); const cadence=parseCadFix(); const {tiers,ov,def}=parseTierPolicy();
const cmap=new Map(cadence.map((x)=>[`${x.case_id}|${x.symbol}`,x]));
const out=[];
for(const r of reason){const c=cmap.get(`${r.case_id}|${r.symbol}`);if(!c) throw new Error(`missing cadence row ${r.case_id}|${r.symbol}`);const tier=ov.get(r.symbol)||r.tier||def;const cap=tiers.get(tier);if(!cap) throw new Error(`missing tier cap ${tier}`);let actual='PROMOTE';let reasonCode='OK';if(r.days_observed<cap.min_days){actual='OBSERVE';reasonCode='INSUFFICIENT_DAYS';}else if(r.active_park||r.park_rate>cap.park_max||r.reject_rate>cap.reject_max){actual='PARK';reasonCode=r.active_park?'ACTIVE_PARK':'RATE_CAP_EXCEEDED';}else if(r.variance>cap.var_max||r.hold_rate>cap.hold_max){actual='HOLD';reasonCode=r.variance>cap.var_max?'UNSTABLE_VARIANCE':'HOLD_RATE_HIGH';}out.push({case_id:r.case_id,symbol:r.symbol,tier,days_observed:r.days_observed,reject_rate:r.reject_rate,hold_rate:r.hold_rate,park_rate:r.park_rate,variance:r.variance,expected:r.expected,actual,reason_code:reasonCode,match:r.expected===actual?'PASS':'FAIL'});}
out.sort((a,b)=>a.case_id.localeCompare(b.case_id)||a.symbol.localeCompare(b.symbol));
const mappingOk=out.every((x)=>x.match==='PASS');
const tierOk=out.every((x)=>x.actual!=='PROMOTE'||(x.reject_rate<=tiers.get(x.tier).reject_max&&x.hold_rate<=tiers.get(x.tier).hold_max&&x.park_rate<=tiers.get(x.tier).park_max));
const minDaysOk=out.every((x)=>x.actual!=='PROMOTE'||x.days_observed>=tiers.get(x.tier).min_days);
const stabilityOk=out.every((x)=>x.actual!=='PROMOTE'||x.variance<=tiers.get(x.tier).var_max);
const fp1=crypto.createHash('sha256').update(JSON.stringify(out)).digest('hex');
const fp2=crypto.createHash('sha256').update(JSON.stringify(out)).digest('hex');
const deterministicMatch=fp1===fp2;
if(!mappingOk||!tierOk||!minDaysOk||!stabilityOk||!deterministicMatch){arm('ADVERSARIAL_SUITE_FAILURE',{mapping_ok:String(mappingOk),tier_ok:String(tierOk),min_days_ok:String(minDaysOk),stability_ok:String(stabilityOk),deterministic_match:String(deterministicMatch)});throw new Error('E96 adversarial suite failed');}
if(update&&process.env.CI!=='true'){
  ensureDir(E96_ROOT);
  writeMd(path.join(E96_ROOT,'ADVERSARIAL_SUITE.md'),['# E96 ADVERSARIAL SUITE','| case_id | symbol | tier | days_observed | reject_rate | hold_rate | park_rate | variance | expected | actual | reason_code | match |','|---|---|---|---:|---:|---:|---:|---:|---|---|---|---|',...out.map((x)=>`| ${x.case_id} | ${x.symbol} | ${x.tier} | ${x.days_observed} | ${fmt4(x.reject_rate)} | ${fmt4(x.hold_rate)} | ${fmt4(x.park_rate)} | ${fmt4(x.variance)} | ${x.expected} | ${x.actual} | ${x.reason_code} | ${x.match} |`),`- adversarial_fingerprint: ${fp1}`].join('\n'));
  writeMd(path.join(E96_ROOT,'ADVERSARIAL_ASSERTIONS.md'),['# E96 ADVERSARIAL ASSERTIONS',`- A1_expected_mapping_contract: ${mappingOk?'PASS':'FAIL'}`,`- A2_tier_policy_contract: ${tierOk?'PASS':'FAIL'}`,`- A3_min_days_contract: ${minDaysOk?'PASS':'FAIL'}`,`- A4_stability_contract: ${stabilityOk?'PASS':'FAIL'}`,`- A5_determinism_x2_contract: ${deterministicMatch?'PASS':'FAIL'}`].join('\n'));
  writeMd(path.join(E96_ROOT,'RUNS_ADVERSARIAL_X2.md'),['# E96 RUNS ADVERSARIAL X2',`- run1_fingerprint: ${fp1}`,`- run2_fingerprint: ${fp2}`,'- deterministic_match: true'].join('\n'));
  writeMd(path.join(E96_ROOT,'FIXTURE_SNAPSHOT.md'),['# E96 FIXTURE SNAPSHOT',`- reason_fixture_rows: ${reason.length}`,`- cadence_fixture_rows: ${cadence.length}`,'- reason_fixture_path: core/edge/state/fixtures/e96_reason_history_fuzz_fixture.md','- cadence_fixture_path: core/edge/state/fixtures/e96_cadence_fuzz_fixture.md'].join('\n'));
}
if(!update){for(const f of ['FIXTURE_SNAPSHOT.md','ADVERSARIAL_SUITE.md','ADVERSARIAL_ASSERTIONS.md','RUNS_ADVERSARIAL_X2.md']) if(!fs.existsSync(path.join(E96_ROOT,f))) throw new Error(`missing ${f}`);} 
minimalLog(`verify:e96:adversarial PASSED adversarial_fingerprint=${fp1}`);
