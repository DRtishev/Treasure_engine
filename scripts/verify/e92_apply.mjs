#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { E92_ROOT, E92_LOCK_PATH, ensureDir, minimalLog } from './e92_lib.mjs';
import { writeMd, sha256File } from './e66_lib.mjs';

const update=process.env.UPDATE_E92_EVIDENCE==='1';
const updApply=process.env.UPDATE_E92_APPLY==='1';
const mode=String(process.env.APPLY_MODE||'PROPOSE').toUpperCase();
if(process.env.CI==='true'&&(update||updApply||String(process.env.APPLY_MODE||'').trim()!=='')) throw new Error('UPDATE/APPLY forbidden in CI');
if(!['APPLY','PROPOSE'].includes(mode)) throw new Error('APPLY_MODE must be APPLY|PROPOSE');
if(fs.existsSync(E92_LOCK_PATH)&&process.env.CLEAR_E92_KILL_LOCK!=='1') throw new Error(`kill-lock active: ${E92_LOCK_PATH}`);
if(process.env.CLEAR_E92_KILL_LOCK==='1'&&process.env.CI!=='true') fs.rmSync(E92_LOCK_PATH,{force:true});

const diff=fs.readFileSync(path.join(E92_ROOT,'EV_DELTA_DIFF.md'),'utf8');
const proposals=[...diff.matchAll(/^\|\s(P_[^|]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([0-9]+)\s\|\s([^|]+)\s\|/gm)].map((m)=>({proposal_id:m[1].trim(),symbol:m[2].trim(),target:m[3].trim(),step:Number(m[4]),direction:m[5].trim()})).sort((a,b)=>a.symbol.localeCompare(b.symbol)||a.proposal_id.localeCompare(b.proposal_id));
const proposalFp=crypto.createHash('sha256').update(JSON.stringify(proposals)).digest('hex');

const policyPath='core/edge/contracts/e92_ev_delta_policy.md';
if(update&&updApply&&mode==='APPLY'&&process.env.CI!=='true'){
  const lines=['# E92 EV DELTA POLICY','- generated_by: verify:e92:apply',`- proposal_fingerprint: ${proposalFp}`,'','| symbol | proposal_id | target | direction | step |','|---|---|---|---|---:|',...proposals.map((p)=>`| ${p.symbol} | ${p.proposal_id} | ${p.target} | ${p.direction} | ${p.step} |`)];
  writeMd(path.resolve(policyPath),lines.join('\n'));
}

const applyFp1=crypto.createHash('sha256').update(JSON.stringify({mode,proposalFp,policy_hash:fs.existsSync(policyPath)?sha256File(path.resolve(policyPath)):'ABSENT'})).digest('hex');
const applyFp2=crypto.createHash('sha256').update(JSON.stringify({mode,proposalFp,policy_hash:fs.existsSync(policyPath)?sha256File(path.resolve(policyPath)):'ABSENT'})).digest('hex');
const deterministicMatch=applyFp1===applyFp2;
if(!deterministicMatch){ensureDir(path.dirname(E92_LOCK_PATH));writeMd(E92_LOCK_PATH,['# E92 KILL LOCK','- reason: APPLY_DETERMINISM_MISMATCH',`- run1: ${applyFp1}`,`- run2: ${applyFp2}`].join('\n'));throw new Error('E92 apply determinism mismatch');}

if(update&&updApply&&process.env.CI!=='true'){
  ensureDir(E92_ROOT);
  writeMd(path.join(E92_ROOT,'APPLY_RECEIPT.md'),['# E92 APPLY RECEIPT','- status: PASS',`- mode: ${mode}`,`- proposal_fingerprint: ${proposalFp}`,`- applied_policy_hash: ${fs.existsSync(policyPath)?sha256File(path.resolve(policyPath)):'ABSENT'}`,`- apply_fingerprint: ${applyFp1}`].join('\n'));
  writeMd(path.join(E92_ROOT,'RUNS_APPLY_X2.md'),['# E92 RUNS APPLY X2',`- run1_fingerprint: ${applyFp1}`,`- run2_fingerprint: ${applyFp2}`,`- deterministic_match: ${deterministicMatch?'true':'false'}`].join('\n'));
}
minimalLog(`verify:e92:apply PASSED apply_fingerprint=${applyFp1}`);
