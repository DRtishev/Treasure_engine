#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { E89_ROOT, E89_FIXTURE, ensureDir, minimalLog } from './e89_lib.mjs';
import { writeMd, sha256File } from './e66_lib.mjs';
import { BASE_POLICY, parseFixtureRowsFromFile, assertRowsOrdered, computeParkAgingDecisions } from './e89_park_aging_core.mjs';

const update=process.env.UPDATE_E89_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E89_EVIDENCE forbidden in CI');
const today=String(process.env.E89_DATE_UTC||new Date(Number(process.env.SOURCE_DATE_EPOCH||'1700000000')*1000).toISOString().slice(0,10));
const rows=parseFixtureRowsFromFile(E89_FIXTURE);
if(rows.length<10||rows.length>40) throw new Error('fixture row count contract violation');
assertRowsOrdered(rows);

const run1=computeParkAgingDecisions({rows,today,policy:BASE_POLICY});
const run2=computeParkAgingDecisions({rows,today,policy:BASE_POLICY});
const fp1=crypto.createHash('sha256').update(JSON.stringify({today,policy:BASE_POLICY,fixture_hash:sha256File(E89_FIXTURE),run:run1})).digest('hex');
const fp2=crypto.createHash('sha256').update(JSON.stringify({today,policy:BASE_POLICY,fixture_hash:sha256File(E89_FIXTURE),run:run2})).digest('hex');
if(fp1!==fp2) throw new Error('fixture court determinism mismatch');

const expect={ALPHA:'R1_KEEP_PARK',BETA:'R2_REJECT_THRESHOLD',GAMMA:'R3_HOLD_STREAK',DELTA:'R4_UNPARK_CLEAN'};
for(const [sym,rule] of Object.entries(expect)){const d=run1.find((x)=>x.symbol===sym);if(!d||d.rule_fired!==rule) throw new Error(`expected ${sym} -> ${rule}`);} 
const coverage=[...new Set(run1.map((x)=>x.rule_fired).filter((x)=>/^R[1-4]_/.test(x)))].sort();
if(coverage.join(',')!=='R1_KEEP_PARK,R2_REJECT_THRESHOLD,R3_HOLD_STREAK,R4_UNPARK_CLEAN') throw new Error('R1-R4 coverage contract failed');

if(update&&process.env.CI!=='true'){
  ensureDir(E89_ROOT);
  writeMd(path.join(E89_ROOT,'FIXTURE_STATE_SNAPSHOT.md'),['# E89 FIXTURE STATE SNAPSHOT',`- fixture_path: core/edge/state/fixtures/e89_reason_history_fixture.md`,`- fixture_hash: ${sha256File(E89_FIXTURE)}`,`- rows: ${rows.length}`,`- today_utc: ${today}`,'','| date_utc | symbol | stage | verdict | reason_codes |','|---|---|---|---|---|',...rows.map((r)=>`| ${r.date_utc} | ${r.symbol} | ${r.stage} | ${r.verdict} | ${r.reason_codes} |`)].join('\n'));
  writeMd(path.join(E89_ROOT,'PARK_AGING_FIXTURE_COURT.md'),['# E89 PARK AGING FIXTURE COURT',`- court_fingerprint: ${fp1}`,`- fixture_hash: ${sha256File(E89_FIXTURE)}`,`- today_utc: ${today}`,'','| symbol | state | park_until | rule_fired | reject_count_m | hold_streak | clean_days_u |','|---|---|---|---|---:|---:|---:|',...run1.map((d)=>`| ${d.symbol} | ${d.state} | ${d.park_until} | ${d.rule_fired} | ${d.reject_count} | ${d.hold_streak} | ${d.clean_days} |`)].join('\n'));
  writeMd(path.join(E89_ROOT,'ASSERTIONS.md'),['# E89 ASSERTIONS','- r1_to_r4_coverage: PASS',`- coverage_rules: ${coverage.join(',')}`,'- expected_mappings: ALPHA->R1,BETA->R2,GAMMA->R3,DELTA->R4','- deterministic_x2: PASS'].join('\n'));
  writeMd(path.join(E89_ROOT,'RUNS_FIXTURE_COURT_X2.md'),['# E89 RUNS FIXTURE COURT X2',`- run1_fingerprint: ${fp1}`,`- run2_fingerprint: ${fp2}`,'- deterministic_match: true'].join('\n'));
}
if(!update){for(const f of ['FIXTURE_STATE_SNAPSHOT.md','PARK_AGING_FIXTURE_COURT.md','ASSERTIONS.md','RUNS_FIXTURE_COURT_X2.md']) if(!fs.existsSync(path.join(E89_ROOT,f))) throw new Error(`missing ${f}`);} 
minimalLog(`verify:e89:fixture:contract PASSED court_fingerprint=${fp1}`);
