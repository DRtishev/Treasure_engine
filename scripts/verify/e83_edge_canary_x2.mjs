#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { runE77CanaryEval } from '../edge/e77_canary_eval.mjs';
import { E83_ROOT, E83_LOCK_PATH, E83_POLICY, ensureDir, quietLog, minimalLog, demoDailySentinel } from './e83_lib.mjs';
import { writeMd, sha256File } from './e66_lib.mjs';

const update=process.env.UPDATE_E83_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E83_EVIDENCE forbidden in CI');
if(fs.existsSync(E83_LOCK_PATH)&&process.env.CLEAR_E83_LOCK!=='1') throw new Error(`kill-lock active: ${E83_LOCK_PATH}`);
if(process.env.CLEAR_E83_LOCK==='1'&&process.env.CI!=='true') fs.rmSync(E83_LOCK_PATH,{force:true});

function scalar(raw,k,d){return Number((raw.match(new RegExp(`- ${k}:\\s*([0-9.]+)`))||[])[1]??d);}
function parsePolicy(){const raw=fs.readFileSync(E83_POLICY,'utf8');return{MIN_WINDOWS_STRICT:scalar(raw,'MIN_WINDOWS_STRICT',4),MAX_DRIFT_STRICT:scalar(raw,'MAX_DRIFT_STRICT',0.0045),MAX_INVALID_STRICT:scalar(raw,'MAX_INVALID_STRICT',0.04),MAX_SPREAD_P50_STRICT:scalar(raw,'MAX_SPREAD_P50_STRICT',0.095),MAX_FEE_AVG_STRICT:scalar(raw,'MAX_FEE_AVG_STRICT',6),MIN_CONSECUTIVE_STRICT:scalar(raw,'MIN_CONSECUTIVE_STRICT',2)};}
function readRecon(){const t=fs.readFileSync(path.join(E83_ROOT,'EXEC_RECON_OBSERVED_MULTI.md'),'utf8');const reconFp=(t.match(/recon_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';const rows=[...t.matchAll(/^\|\s([^|]+)\s\|\s([0-9]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|/gm)].map((m)=>({symbol:m[1].trim(),windows_count:Number(m[2]),invalid_row_rate:Number(m[3]),drift_proxy:Number(m[4]),spread_p50:Number(m[5]),fee_avg:Number(m[6])}));return{reconFp,rows};}
function readCal(){const t=fs.readFileSync(path.resolve('reports/evidence/E82/CALIBRATION_COURT.md'),'utf8');return{calHash:(t.match(/new_cal_hash:\s*([a-f0-9]{64})/)||[])[1]||'',driftRate:Number((t.match(/drift_rate:\s*([0-9.]+)/)||[])[1]||'1')};}
function readReadiness(){const p=path.join(E83_ROOT,'READINESS_TREND.md');if(!fs.existsSync(p)) return new Map();const t=fs.readFileSync(p,'utf8');const m=new Map();for(const r of t.matchAll(/^\|\s([^|]+)\s\|\s([0-9]+)\s\|\s([^|]+)\|\s([0-9]+)\s\|\s([0-9]+)\s\|\s([^|]+)\|/gm))m.set(r[1].trim(),{consec:Number(r[4]),req:Number(r[5]),readiness:r[6].trim()});return m;}
function readShortlistHash(){const p=path.resolve('reports/evidence/E80/EDGE_SHORTLIST.md');return fs.existsSync(p)?sha256File(p):'';}
function readThresholdHashes(){const t=fs.readFileSync(path.join(E83_ROOT,'THRESHOLD_COURT.md'),'utf8');return{prev:(t.match(/previous_threshold_hash:\s*([a-f0-9]{64})/)||[])[1]||'',next:(t.match(/new_threshold_hash:\s*([a-f0-9]{64})/)||[])[1]||''};}
function decide(input){
  const p=parsePolicy(),recon=readRecon(),cal=readCal(),ready=readReadiness();
  const decisions=recon.rows.sort((a,b)=>a.symbol.localeCompare(b.symbol)).map((r)=>{
    const reasons=[];
    if(r.windows_count<p.MIN_WINDOWS_STRICT) reasons.push('WINDOWS_LT_MIN');
    if(cal.driftRate>p.MAX_DRIFT_STRICT) reasons.push('DRIFT_GT_STRICT');
    if(r.invalid_row_rate>p.MAX_INVALID_STRICT) reasons.push('INVALID_GT_MAX');
    if(r.spread_p50>p.MAX_SPREAD_P50_STRICT) reasons.push('SPREAD_GT_MAX');
    if(r.fee_avg>p.MAX_FEE_AVG_STRICT) reasons.push('FEE_GT_MAX');
    const rr=ready.get(r.symbol); if(!rr||rr.consec<p.MIN_CONSECUTIVE_STRICT) reasons.push('READINESS_STREAK_LT_K');
    const strict=reasons.length===0;
    const stage=input==='AUTO'?(strict?'STRICT_1':'BASELINE'):input;
    const promotion=(stage==='STRICT_1'&&strict)?'PASS':'FAIL';
    return{symbol:r.symbol,stage_decision:stage,promotion,reasons:reasons.length?reasons:['PROMOTED'],recon_windows:r.windows_count,invalid_row_rate:r.invalid_row_rate,spread_p50:r.spread_p50,fee_avg:r.fee_avg,calibration_drift_rate:cal.driftRate};
  });
  return {decisions,reconFp:recon.reconFp,cal};
}
function once(stage){const d=decide(stage);const evalRun=runE77CanaryEval({seed:Number(process.env.SEED||'12345')});const threshold=readThresholdHashes();const sentinel=demoDailySentinel();const fp=crypto.createHash('sha256').update(JSON.stringify({recon_fingerprint:d.reconFp,demo_daily_sentinel:sentinel,calibration_hash:d.cal.calHash,calibration_drift_rate:d.cal.driftRate,thresholds_hash:sha256File(path.resolve('core/edge/contracts/e78_canary_thresholds.md')),threshold_policy_hash:sha256File(E83_POLICY),threshold_court_previous_hash:threshold.prev,threshold_court_new_hash:threshold.next,shortlist_hash:readShortlistHash(),stage_decision:d.decisions,rows:evalRun.rows})).digest('hex');return{...d,sentinel,threshold,shortlistHash:readShortlistHash(),fp};}

const inputStage=String(process.env.CANARY_STAGE||'AUTO').toUpperCase();
if(!['AUTO','BASELINE','STRICT_1'].includes(inputStage)) throw new Error('CANARY_STAGE must be AUTO|BASELINE|STRICT_1');
const r1=once(inputStage),r2=once(inputStage),ok=r1.fp===r2.fp;
if(!ok||process.env.FORCE_E83_MISMATCH==='1'){ensureDir(path.dirname(E83_LOCK_PATH));writeMd(E83_LOCK_PATH,['# E83 KILL LOCK','- reason: DETERMINISTIC_MISMATCH',`- run1_fingerprint: ${r1.fp}`,`- run2_fingerprint: ${r2.fp}`].join('\n'));throw new Error('verify:edge:canary:x2:e83 FAILED');}
if(update&&process.env.CI!=='true'){
  ensureDir(E83_ROOT);
  const lines=['# E83 RUNS EDGE CANARY X2',`- canary_stage: ${inputStage}`,`- run1_fingerprint: ${r1.fp}`,`- run2_fingerprint: ${r2.fp}`,'- deterministic_match: true',`- recon_fingerprint: ${r1.reconFp}`,`- calibration_hash: ${r1.cal.calHash}`,`- demo_daily_sentinel: ${r1.sentinel}`,`- threshold_court_previous_hash: ${r1.threshold.prev}`,`- threshold_court_new_hash: ${r1.threshold.next}`,`- stage_policy_hash: ${sha256File(E83_POLICY)}`,`- shortlist_hash: ${r1.shortlistHash}`,'','## stage_decision','| symbol | stage_decision | promotion | reason_codes | recon_windows | invalid_row_rate | spread_p50 | fee_avg | calibration_drift_rate |','|---|---|---|---|---:|---:|---:|---:|---:|'];
  for(const d of r1.decisions) lines.push(`| ${d.symbol} | ${d.stage_decision} | ${d.promotion} | ${d.reasons.join(',')} | ${d.recon_windows} | ${d.invalid_row_rate.toFixed(8)} | ${d.spread_p50.toFixed(6)} | ${d.fee_avg.toFixed(6)} | ${d.calibration_drift_rate.toFixed(8)} |`);
  lines.push('','## PROMOTION_READINESS');
  for(const d of r1.decisions) lines.push(`- ${d.symbol}: ${d.promotion} (${d.reasons.join(',')})`);
  writeMd(path.join(E83_ROOT,'RUNS_EDGE_CANARY_X2.md'),lines.join('\n'));
  writeMd(path.join(E83_ROOT,'EDGE_CANARY.md'),['# E83 EDGE CANARY',`- canary_stage: ${inputStage}`,`- promotion_symbols: ${r1.decisions.filter((d)=>d.promotion==='PASS').map((x)=>x.symbol).join(',')}`].join('\n'));
}
quietLog(JSON.stringify({deterministic_match:true,run_fingerprint:r1.fp},null,2));
minimalLog(`verify:edge:canary:x2:e83 PASSED run_fingerprint=${r1.fp}`);
