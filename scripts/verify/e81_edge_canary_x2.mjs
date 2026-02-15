#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { runE77CanaryEval } from '../edge/e77_canary_eval.mjs';
import { E81_ROOT, E81_LOCK_PATH, E81_POLICY, ensureDir, quietLog, minimalLog } from './e81_lib.mjs';
import { writeMd, sha256File } from './e66_lib.mjs';

const update=process.env.UPDATE_E81_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E81_EVIDENCE forbidden in CI');
if(fs.existsSync(E81_LOCK_PATH)&&process.env.CLEAR_E81_LOCK!=='1') throw new Error(`kill-lock active: ${E81_LOCK_PATH}`);
if(process.env.CLEAR_E81_LOCK==='1'&&process.env.CI!=='true') fs.rmSync(E81_LOCK_PATH,{force:true});

function scalar(raw,k,d){return Number((raw.match(new RegExp(`- ${k}:\\s*([0-9.]+)`))||[])[1]??d);}
function parsePolicy(){const raw=fs.readFileSync(E81_POLICY,'utf8');return{MIN_WINDOWS_STRICT:scalar(raw,'MIN_WINDOWS_STRICT',3),MAX_DRIFT_STRICT:scalar(raw,'MAX_DRIFT_STRICT',0.005),MAX_INVALID_STRICT:scalar(raw,'MAX_INVALID_STRICT',0.05)};}
function readRecon(){const t=fs.readFileSync(path.join(E81_ROOT,'EXEC_RECON_OBSERVED_MULTI.md'),'utf8');const reconFp=(t.match(/recon_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';const rows=[...t.matchAll(/^\|\s([^|]+)\s\|\s([0-9]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|/gm)].map((m)=>({symbol:m[1].trim(),windows_count:Number(m[2]),invalid_row_rate:Number(m[3]),drift_proxy:Number(m[4])}));return{reconFp,rows};}
function readCal(){const t=fs.readFileSync(path.join(E81_ROOT,'CALIBRATION_COURT.md'),'utf8');return{calHash:(t.match(/new_cal_hash:\s*([a-f0-9]{64})/)||[])[1]||'',driftRate:Number((t.match(/\| drift_rate \| ([0-9.]+) \|/)||[])[1]||'1')};}
function readDemo(){const p=path.join(E81_ROOT,'EXEC_RECON_DEMO_MICROFILL.md');if(!fs.existsSync(p)) return '';return (fs.readFileSync(p,'utf8').match(/redacted_payload_sha256:\s*([a-f0-9]{64})/)||[])[1]||'';}
function decide(input){const p=parsePolicy(),recon=readRecon(),cal=readCal();const decisions=recon.rows.sort((a,b)=>a.symbol.localeCompare(b.symbol)).map((r)=>{const strict=r.windows_count>=p.MIN_WINDOWS_STRICT&&cal.driftRate<=p.MAX_DRIFT_STRICT&&r.invalid_row_rate<=p.MAX_INVALID_STRICT;const stage=input==='AUTO'?(strict?'STRICT_1':'BASELINE'):input;const readiness=stage==='STRICT_1'?'PASS':'FAIL';return{symbol:r.symbol,stage_decision:stage,promotion:readiness,recon_windows:r.windows_count,invalid_row_rate:r.invalid_row_rate,calibration_drift_rate:cal.driftRate};});return{decisions,reconFp:recon.reconFp,cal};}
function once(stage){const d=decide(stage);const evalRun=runE77CanaryEval({seed:Number(process.env.SEED||'12345')});const fp=crypto.createHash('sha256').update(JSON.stringify({recon_fingerprint:d.reconFp,demo_payload_sha:readDemo(),calibration_hash:d.cal.calHash,thresholds_hash:sha256File(path.resolve('core/edge/contracts/e78_canary_thresholds.md')),stage_policy_hash:sha256File(E81_POLICY),stage_decision:d.decisions,rows:evalRun.rows})).digest('hex');return{...d,fp};}

const inputStage=String(process.env.CANARY_STAGE||'AUTO').toUpperCase();
if(!['AUTO','BASELINE','STRICT_1'].includes(inputStage)) throw new Error('CANARY_STAGE must be AUTO|BASELINE|STRICT_1');
const r1=once(inputStage),r2=once(inputStage);const ok=r1.fp===r2.fp;
if(!ok||process.env.FORCE_E81_MISMATCH==='1'){ensureDir(path.dirname(E81_LOCK_PATH));writeMd(E81_LOCK_PATH,['# E81 KILL LOCK','- reason: DETERMINISTIC_MISMATCH',`- run1_fingerprint: ${r1.fp}`,`- run2_fingerprint: ${r2.fp}`].join('\n'));throw new Error('verify:edge:canary:x2:e81 FAILED');}
if(update&&process.env.CI!=='true'){ensureDir(E81_ROOT);const lines=['# E81 RUNS EDGE CANARY X2',`- canary_stage: ${inputStage}`,`- run1_fingerprint: ${r1.fp}`,`- run2_fingerprint: ${r2.fp}`,'- deterministic_match: true',`- recon_fingerprint: ${r1.reconFp}`,`- calibration_hash: ${r1.cal.calHash}`,`- stage_policy_hash: ${sha256File(E81_POLICY)}`,'','## stage_decision','| symbol | stage_decision | promotion | recon_windows | invalid_row_rate | calibration_drift_rate |','|---|---|---|---:|---:|---:|'];for(const d of r1.decisions) lines.push(`| ${d.symbol} | ${d.stage_decision} | ${d.promotion} | ${d.recon_windows} | ${d.invalid_row_rate.toFixed(8)} | ${d.calibration_drift_rate.toFixed(8)} |`);lines.push('','## PROMOTION_READINESS');for(const d of r1.decisions) lines.push(`- ${d.symbol}: ${d.promotion}`);writeMd(path.join(E81_ROOT,'RUNS_EDGE_CANARY_X2.md'),lines.join('\n'));writeMd(path.join(E81_ROOT,'EDGE_CANARY.md'),['# E81 EDGE CANARY',`- canary_stage: ${inputStage}`,`- promotion_symbols: ${r1.decisions.filter((d)=>d.promotion==='PASS').map((x)=>x.symbol).join(',')}`].join('\n'));}
quietLog(JSON.stringify({deterministic_match:true,run_fingerprint:r1.fp},null,2));
minimalLog(`verify:edge:canary:x2:e81 PASSED run_fingerprint=${r1.fp}`);
