#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { E84_ROOT, E84_POLICY, ensureDir, quietLog, minimalLog } from './e84_lib.mjs';
import { writeMd, sha256File } from './e66_lib.mjs';

const update=process.env.UPDATE_E84_EVIDENCE==='1';
const updateThresholds=process.env.UPDATE_E84_THRESHOLDS==='1';
if(process.env.CI==='true'&&(update||updateThresholds)) throw new Error('UPDATE_E84 flags forbidden in CI');
function scalar(raw,k,d){return Number((raw.match(new RegExp(`- ${k}:\\s*([0-9.]+)`))||[])[1]??d);}
const pRaw=fs.readFileSync(E84_POLICY,'utf8');
const current={MIN_WINDOWS_STRICT:scalar(pRaw,'MIN_WINDOWS_STRICT',4),MAX_INVALID_STRICT:scalar(pRaw,'MAX_INVALID_STRICT',0.04),MAX_SPREAD_P50_STRICT:scalar(pRaw,'MAX_SPREAD_P50_STRICT',0.095),MAX_FEE_AVG_STRICT:scalar(pRaw,'MAX_FEE_AVG_STRICT',6)};
const recon=fs.readFileSync(path.join(E84_ROOT,'EXEC_RECON_OBSERVED_MULTI.md'),'utf8');
const rows=[...recon.matchAll(/^\|\s([^|]+)\s\|\s([0-9]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|/gm)].map((m)=>({symbol:m[1].trim(),windows:Number(m[2]),invalid:Number(m[3]),spread:Number(m[5]),fee:Number(m[6])}));
const prevEstablished=(fs.readFileSync(path.resolve('reports/evidence/E83/THRESHOLD_COURT.md'),'utf8').match(/new_threshold_hash:\s*([a-f0-9]{64})/)||[])[1]||'';
if(!prevEstablished) throw new Error('missing previous threshold hash');
const proposed={MIN_WINDOWS_STRICT:Math.max(current.MIN_WINDOWS_STRICT,Math.min(8,Math.max(...rows.map((r)=>r.windows)))),MAX_INVALID_STRICT:Number(Math.min(current.MAX_INVALID_STRICT,Math.max(...rows.map((r)=>r.invalid))*1.05).toFixed(4)),MAX_SPREAD_P50_STRICT:Number(Math.min(current.MAX_SPREAD_P50_STRICT,Math.max(...rows.map((r)=>r.spread))*1.05).toFixed(4)),MAX_FEE_AVG_STRICT:Number(Math.min(current.MAX_FEE_AVG_STRICT,Math.max(...rows.map((r)=>r.fee))*1.05).toFixed(4))};
const reason=[];for(const k of Object.keys(current)){if(proposed[k]===current[k]) reason.push(`${k}_UNCHANGED`); else if((k.startsWith('MAX_')&&proposed[k]<current[k])||(k==='MIN_WINDOWS_STRICT'&&proposed[k]>current[k])) reason.push(`${k}_MONOTONIC_TIGHTEN`); else reason.push(`${k}_RELAX_JUSTIFIED`);} 
const prevHash=sha256File(E84_POLICY);
const nextHash=updateThresholds?crypto.createHash('sha256').update(JSON.stringify(proposed)).digest('hex'):prevHash;
const fp=crypto.createHash('sha256').update(JSON.stringify({current,proposed,reason,prevEstablished})).digest('hex');
if(update&&process.env.CI!=='true'){ensureDir(E84_ROOT);writeMd(path.join(E84_ROOT,'THRESHOLD_COURT.md'),['# E84 THRESHOLD COURT','- status: PASS',`- continuity_previous_threshold_hash: ${prevEstablished}`,`- previous_threshold_hash: ${prevHash}`,`- new_threshold_hash: ${nextHash}`,`- reason_codes: ${reason.join(',')}`,`- update_thresholds: ${updateThresholds?'true':'false'}`,`- threshold_court_fingerprint: ${fp}`,'','| key | current | proposed |','|---|---:|---:|',...Object.keys(current).sort().map((k)=>`| ${k} | ${current[k]} | ${proposed[k]} |`)].join('\n'));writeMd(path.join(E84_ROOT,'THRESHOLD_DIFF.md'),['# E84 THRESHOLD DIFF',`- previous_threshold_hash: ${prevHash}`,`- new_threshold_hash: ${nextHash}`,'','| key | old | new | delta |','|---|---:|---:|---:|',...Object.keys(current).sort().map((k)=>`| ${k} | ${current[k]} | ${proposed[k]} | ${(proposed[k]-current[k]).toFixed(4)} |`)].join('\n'));writeMd(path.join(E84_ROOT,'THRESHOLD_CHANGELOG.md'),['# E84 THRESHOLD CHANGELOG',`- continuity_previous_threshold_hash: ${prevEstablished}`,`- reason_codes: ${reason.join(',')}`,`- update_thresholds: ${updateThresholds?'true':'false'}`].join('\n'));}
if(!update&&!fs.existsSync(path.join(E84_ROOT,'THRESHOLD_COURT.md'))) throw new Error('missing THRESHOLD_COURT.md');
quietLog(JSON.stringify({threshold_court_fingerprint:fp,reason_codes:reason},null,2));
minimalLog(`verify:e84:threshold:court PASSED threshold_court_fingerprint=${fp}`);
