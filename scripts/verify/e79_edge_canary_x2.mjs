#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { runE77CanaryEval } from '../edge/e77_canary_eval.mjs';
import { E79_ROOT, E79_LOCK_PATH, E79_POLICY, ensureDir, quietLog, minimalLog } from './e79_lib.mjs';
import { writeMd, sha256File } from './e66_lib.mjs';

const update=process.env.UPDATE_E79_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E79_EVIDENCE forbidden in CI');
if(fs.existsSync(E79_LOCK_PATH)&&process.env.CLEAR_E79_LOCK!=='1') throw new Error(`kill-lock active: ${E79_LOCK_PATH}`);
if(process.env.CLEAR_E79_LOCK==='1'&&process.env.CI!=='true') fs.rmSync(E79_LOCK_PATH,{force:true});

function parseScalar(raw,k,d){return Number((raw.match(new RegExp(`- ${k}:\\s*([0-9.]+)`))||[])[1]??d);}
function parsePolicy(){
  const raw=fs.readFileSync(E79_POLICY,'utf8');
  return {MIN_WINDOWS_STRICT:parseScalar(raw,'MIN_WINDOWS_STRICT',3),MAX_DRIFT_STRICT:parseScalar(raw,'MAX_DRIFT_STRICT',0.005),MAX_INVALID_STRICT:parseScalar(raw,'MAX_INVALID_STRICT',0.05)};
}
function readRecon(){const p=path.join(E79_ROOT,'EXEC_RECON_OBSERVED_MULTI.md');const t=fs.readFileSync(p,'utf8');const fp=(t.match(/recon_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';const rows=[...t.matchAll(/^\|\s([^|]+)\s\|\s([^|]+)\s\|\s([0-9]+)\s\|\s([0-9]+)\s\|/gm)].map((m)=>({symbol:m[1].trim(),window:m[2].trim(),accepted:Number(m[3]),rejected:Number(m[4])}));return{fp,rows};}
function readShortlist(){const p=path.join(E79_ROOT,'EDGE_SHORTLIST.md');const t=fs.readFileSync(p,'utf8');const fp=(t.match(/shortlist_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';return{fp};}
function readCalDrift(){const t=fs.readFileSync(path.resolve('reports/evidence/E78/CALIBRATION_COURT.md'),'utf8');const prev=(t.match(/previous_cal_hash:\s*([a-f0-9]{64})/)||[])[1]||'';const next=(t.match(/new_cal_hash:\s*([a-f0-9]{64})/)||[])[1]||'';return {rate: prev===next?0:0.01, hash: next};}

function stageDecision(stageInput,policy,reconRows,drift){
  const bySym=new Map();
  for(const r of reconRows){const item=bySym.get(r.symbol)||{windows:new Set(),acc:0,rej:0}; item.windows.add(r.window); item.acc+=r.accepted; item.rej+=r.rejected; bySym.set(r.symbol,item);}
  const decisions=[];
  for(const [symbol,v] of [...bySym.entries()].sort((a,b)=>a[0].localeCompare(b[0]))){
    const invalidRate=(v.acc+v.rej)?(v.rej/(v.acc+v.rej)):1;
    const autoStrict=v.windows.size>=policy.MIN_WINDOWS_STRICT&&drift.rate<=policy.MAX_DRIFT_STRICT&&invalidRate<=policy.MAX_INVALID_STRICT;
    const stage=stageInput==='AUTO'?(autoStrict?'STRICT_1':'BASELINE'):stageInput;
    const reason=autoStrict?'AUTO_STRICT_RULES_MET':'AUTO_BASELINE_RULES';
    decisions.push({symbol,stage,reason,recon_windows:v.windows.size,invalid_row_rate:Number(invalidRate.toFixed(8)),calibration_drift_rate:drift.rate});
  }
  return decisions;
}

function once(stage){
  const recon=readRecon();
  const shortlist=readShortlist();
  const drift=readCalDrift();
  const policy=parsePolicy();
  const decisions=stageDecision(stage,policy,recon.rows,drift);
  const evalRun=runE77CanaryEval({seed:Number(process.env.SEED||'12345')});
  const fp=crypto.createHash('sha256').update(JSON.stringify({recon_fingerprint:recon.fp,calibration_hash:drift.hash,thresholds_hash:sha256File(path.resolve('core/edge/contracts/e78_canary_thresholds.md')),stage_policy_hash:sha256File(E79_POLICY),shortlist_fingerprint:shortlist.fp,stage_decision:decisions,rows:evalRun.rows})).digest('hex');
  return {fp,decisions,recon_fingerprint:recon.fp,calibration_hash:drift.hash,shortlist_fingerprint:shortlist.fp};
}

const inputStage=String(process.env.CANARY_STAGE||(process.env.CI==='true'?'AUTO':'AUTO')).toUpperCase();
if(!['AUTO','BASELINE','STRICT_1'].includes(inputStage)) throw new Error('CANARY_STAGE must be AUTO|BASELINE|STRICT_1');
const run1=once(inputStage), run2=once(inputStage);
const match=run1.fp===run2.fp;
if(!match||process.env.FORCE_E79_MISMATCH==='1'){
  ensureDir(path.dirname(E79_LOCK_PATH));
  writeMd(E79_LOCK_PATH,['# E79 KILL LOCK','- reason: DETERMINISTIC_MISMATCH',`- run1_fingerprint: ${run1.fp}`,`- run2_fingerprint: ${run2.fp}`].join('\n'));
  throw new Error('verify:edge:canary:x2:e79 FAILED');
}
if(update&&process.env.CI!=='true'){
  ensureDir(E79_ROOT);
  const lines=['# E79 RUNS EDGE CANARY X2',`- canary_stage: ${inputStage}`,`- run1_fingerprint: ${run1.fp}`,`- run2_fingerprint: ${run2.fp}`,'- deterministic_match: true',`- recon_fingerprint: ${run1.recon_fingerprint}`,`- calibration_hash: ${run1.calibration_hash}`,`- thresholds_hash: ${sha256File(path.resolve('core/edge/contracts/e78_canary_thresholds.md'))}`,`- stage_policy_hash: ${sha256File(E79_POLICY)}`,`- shortlist_fingerprint: ${run1.shortlist_fingerprint}`,'','## stage_decision','| symbol | stage_decision | reason | recon_windows | invalid_row_rate | calibration_drift_rate |','|---|---|---|---:|---:|---:|'];
  for(const d of run1.decisions) lines.push(`| ${d.symbol} | ${d.stage} | ${d.reason} | ${d.recon_windows} | ${d.invalid_row_rate} | ${d.calibration_drift_rate} |`);
  writeMd(path.join(E79_ROOT,'RUNS_EDGE_CANARY_X2.md'),lines.join('\n'));
  writeMd(path.join(E79_ROOT,'EDGE_CANARY.md'),['# E79 EDGE CANARY',`- canary_stage: ${inputStage}`,`- stage_decision_fingerprint: ${crypto.createHash('sha256').update(JSON.stringify(run1.decisions)).digest('hex')}`].join('\n'));
}
quietLog(JSON.stringify({deterministic_match:match,run_fingerprint:run1.fp},null,2));
minimalLog(`verify:edge:canary:x2:e79 PASSED run_fingerprint=${run1.fp}`);
