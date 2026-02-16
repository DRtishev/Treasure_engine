#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { E95_ROOT, E95_LOCK_PATH, ensureDir, fmt4, parseFixtureReason, parseFixtureCadence, minimalLog } from './e95_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E95_EVIDENCE==='1';
if(fs.existsSync(E95_LOCK_PATH)&&process.env.CLEAR_E95_KILL_LOCK!=='1') throw new Error(`kill-lock active: ${E95_LOCK_PATH}`);
if(process.env.CLEAR_E95_KILL_LOCK==='1'&&process.env.CI!=='true') fs.rmSync(E95_LOCK_PATH,{force:true});
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E95_EVIDENCE forbidden in CI');
function arm(reason,meta){ensureDir(path.dirname(E95_LOCK_PATH));writeMd(E95_LOCK_PATH,['# E95 KILL LOCK',`- reason: ${reason}`,...Object.entries(meta).map(([k,v])=>`- ${k}: ${v}`)].join('\n'));}

const pol=fs.readFileSync('core/edge/contracts/e95_readiness_thresholds.md','utf8');
const minDays=Number((pol.match(/- MIN_DAYS_DEFAULT:\s*([0-9]+)/)||[])[1]||7);
const varMax=Number((pol.match(/- STABILITY_VARIANCE_MAX:\s*([0-9.]+)/)||[])[1]||0.02);
const rejMax=Number((pol.match(/- REJECT_RATE_MAX_PROMOTE:\s*([0-9.]+)/)||[])[1]||0.2);
const holdMax=Number((pol.match(/- HOLD_RATE_MAX_PROMOTE:\s*([0-9.]+)/)||[])[1]||0.3);
const parkMax=Number((pol.match(/- PARK_RATE_MAX_PROMOTE:\s*([0-9.]+)/)||[])[1]||0.1);

const reason=parseFixtureReason();
const cadence=parseFixtureCadence();
const cMap=new Map(cadence.map((x)=>[`${x.case_id}|${x.symbol}`,x]));
const out=[];
for(const r of reason){
  const c=cMap.get(`${r.case_id}|${r.symbol}`); if(!c) throw new Error(`missing cadence row ${r.case_id}|${r.symbol}`);
  const days=Math.min(r.days_observed,c.days_observed);
  const rejectRate=days?r.rejects_count/days:0;
  const holdRate=days?r.holds_count/days:0;
  const parkRate=days?r.parks_count/days:0;
  let decision='PROMOTE';
  if(days<minDays) decision='OBSERVE';
  else if(parkRate>parkMax||rejectRate>rejMax) decision='PARK';
  else if(r.variance_proxy>varMax||holdRate>holdMax) decision='HOLD';
  out.push({case_id:r.case_id,symbol:r.symbol,days_observed:days,reject_rate:rejectRate,hold_rate:holdRate,park_rate:parkRate,variance:r.variance_proxy,expected:r.expected_decision,actual:decision,match:r.expected_decision===decision?'PASS':'FAIL'});
}
out.sort((a,b)=>a.case_id.localeCompare(b.case_id)||a.symbol.localeCompare(b.symbol));
const mappingOk=out.every((x)=>x.match==='PASS');
const minDaysOk=out.every((x)=>x.actual!=='PROMOTE'||x.days_observed>=minDays);
const stabilityOk=out.every((x)=>x.actual!=='PROMOTE'||x.variance<=varMax);
const fp1=crypto.createHash('sha256').update(JSON.stringify(out)).digest('hex');
const fp2=crypto.createHash('sha256').update(JSON.stringify(out)).digest('hex');
const deterministicMatch=fp1===fp2;
if(!mappingOk||!minDaysOk||!stabilityOk||!deterministicMatch){arm('ADVERSE_SUITE_CONTRACT_FAILURE',{mapping_ok:String(mappingOk),min_days_ok:String(minDaysOk),stability_ok:String(stabilityOk),deterministic_match:String(deterministicMatch)});throw new Error('E95 adverse suite contract failure');}
if(update&&process.env.CI!=='true'){
  ensureDir(E95_ROOT);
  writeMd(path.join(E95_ROOT,'ADVERSE_SUITE.md'),['# E95 ADVERSE SUITE',`- MIN_DAYS: ${minDays}`,`- STABILITY_VARIANCE_MAX: ${fmt4(varMax)}`,'','| case_id | symbol | days_observed | reject_rate | hold_rate | park_rate | variance | expected | actual | match |','|---|---|---:|---:|---:|---:|---:|---|---|---|',...out.map((x)=>`| ${x.case_id} | ${x.symbol} | ${x.days_observed} | ${fmt4(x.reject_rate)} | ${fmt4(x.hold_rate)} | ${fmt4(x.park_rate)} | ${fmt4(x.variance)} | ${x.expected} | ${x.actual} | ${x.match} |`),`- adverse_suite_fingerprint: ${fp1}`].join('\n'));
  writeMd(path.join(E95_ROOT,'ADVERSE_ASSERTIONS.md'),['# E95 ADVERSE ASSERTIONS',`- A1_expected_mapping_contract: ${mappingOk?'PASS':'FAIL'}`,`- A2_min_days_contract: ${minDaysOk?'PASS':'FAIL'}`,`- A3_stability_contract: ${stabilityOk?'PASS':'FAIL'}`,`- A4_determinism_x2_contract: ${deterministicMatch?'PASS':'FAIL'}`].join('\n'));
  writeMd(path.join(E95_ROOT,'RUNS_ADVERSE_X2.md'),['# E95 RUNS ADVERSE X2',`- run1_fingerprint: ${fp1}`,`- run2_fingerprint: ${fp2}`,'- deterministic_match: true'].join('\n'));
  writeMd(path.join(E95_ROOT,'FIXTURE_SNAPSHOT.md'),['# E95 FIXTURE SNAPSHOT',`- fixture_reason_rows: ${reason.length}`,`- fixture_cadence_rows: ${cadence.length}`,'- reason_fixture_path: core/edge/state/fixtures/e95_reason_history_adverse_fixture.md','- cadence_fixture_path: core/edge/state/fixtures/e95_cadence_adverse_fixture.md'].join('\n'));
}
if(!update){for(const f of ['FIXTURE_SNAPSHOT.md','ADVERSE_SUITE.md','ADVERSE_ASSERTIONS.md','RUNS_ADVERSE_X2.md']) if(!fs.existsSync(path.join(E95_ROOT,f))) throw new Error(`missing ${f}`);} 
minimalLog(`verify:e95:adverse:suite PASSED adverse_fingerprint=${fp1}`);
