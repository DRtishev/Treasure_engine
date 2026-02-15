#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { E86_ROOT, E86_THRESHOLD_POLICY, demoDailySentinel, ensureDir, quietLog, minimalLog } from './e86_lib.mjs';
import { writeMd, sha256File } from './e66_lib.mjs';

const update=process.env.UPDATE_E86_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E86_EVIDENCE forbidden in CI');
const obs=fs.readFileSync(path.resolve('reports/evidence/E84/EXEC_RECON_OBSERVED_MULTI.md'),'utf8');
const rows=[...obs.matchAll(/^\|\s([^|]+)\s\|\s([0-9]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|/gm)].map((m)=>({symbol:m[1].trim(),windows:Number(m[2]),invalid:Number(m[3]),drift:Number(m[4]),spread:Number(m[5]),fee:Number(m[6])})).sort((a,b)=>a.symbol.localeCompare(b.symbol));
const policyRaw=fs.readFileSync(E86_THRESHOLD_POLICY,'utf8');
function scalar(k,d){return Number((policyRaw.match(new RegExp(`- ${k}:\\s*([0-9.]+)`))||[])[1]??d);}
const current={MIN_WINDOWS_STRICT:scalar('MIN_WINDOWS_STRICT',4),MAX_INVALID_STRICT:scalar('MAX_INVALID_STRICT',0.04),MAX_SPREAD_P50_STRICT:scalar('MAX_SPREAD_P50_STRICT',0.095),MAX_FEE_AVG_STRICT:scalar('MAX_FEE_AVG_STRICT',6)};
const proposed={MIN_WINDOWS_STRICT:Math.max(current.MIN_WINDOWS_STRICT,Math.max(...rows.map((r)=>r.windows))),MAX_INVALID_STRICT:Number(Math.min(current.MAX_INVALID_STRICT,Math.max(...rows.map((r)=>r.invalid))*1.05).toFixed(4)),MAX_SPREAD_P50_STRICT:Number(Math.min(current.MAX_SPREAD_P50_STRICT,Math.max(...rows.map((r)=>r.spread))*1.05).toFixed(4)),MAX_FEE_AVG_STRICT:Number(Math.min(current.MAX_FEE_AVG_STRICT,Math.max(...rows.map((r)=>r.fee))*1.05).toFixed(4))};
const reasons=Object.keys(current).sort().map((k)=>proposed[k]===current[k]?`${k}_UNCHANGED`:(k.startsWith('MAX_')&&proposed[k]<current[k])||(k==='MIN_WINDOWS_STRICT'&&proposed[k]>current[k])?`${k}_TIGHTEN`:`${k}_RELAX_JUSTIFIED`);
const fp=crypto.createHash('sha256').update(JSON.stringify({current,proposed,reasons,sentinel:demoDailySentinel()})).digest('hex');
if(update&&process.env.CI!=='true'){ensureDir(E86_ROOT);writeMd(path.join(E86_ROOT,'TIGHTENING_COURT.md'),['# E86 TIGHTENING COURT','- status: PASS',`- threshold_policy_hash: ${sha256File(E86_THRESHOLD_POLICY)}`,`- demo_daily_sentinel: ${demoDailySentinel()}`,`- reason_codes: ${reasons.join(',')}`,`- tightening_court_fingerprint: ${fp}`,'','| key | current | proposed |','|---|---:|---:|',...Object.keys(current).sort().map((k)=>`| ${k} | ${current[k]} | ${proposed[k]} |`)].join('\n'));writeMd(path.join(E86_ROOT,'TIGHTENING_DIFF.md'),['# E86 TIGHTENING DIFF','| key | old | new | delta |','|---|---:|---:|---:|',...Object.keys(current).sort().map((k)=>`| ${k} | ${current[k]} | ${proposed[k]} | ${(proposed[k]-current[k]).toFixed(4)} |`)].join('\n'));writeMd(path.join(E86_ROOT,'TIGHTENING_CHANGELOG.md'),['# E86 TIGHTENING CHANGELOG',`- reason_codes: ${reasons.join(',')}`,`- tightening_court_fingerprint: ${fp}`].join('\n'));}
if(!update&&!fs.existsSync(path.join(E86_ROOT,'TIGHTENING_COURT.md'))) throw new Error('missing TIGHTENING_COURT.md');
quietLog(JSON.stringify({tightening_court_fingerprint:fp},null,2));minimalLog(`verify:e86:tightening:court PASSED tightening_court_fingerprint=${fp}`);
