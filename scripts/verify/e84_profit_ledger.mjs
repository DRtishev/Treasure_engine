#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { E84_ROOT, ensureDir, demoDailySentinel, quietLog, minimalLog } from './e84_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E84_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E84_EVIDENCE forbidden in CI');
function parseObserved(){const t=fs.readFileSync(path.join(E84_ROOT,'EXEC_RECON_OBSERVED_MULTI.md'),'utf8');return [...t.matchAll(/^\|\s([^|]+)\s\|\s([0-9]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|/gm)].map((m)=>({symbol:m[1].trim(),windows:Number(m[2]),invalid:Number(m[3]),drift:Number(m[4]),spread:Number(m[5]),fee:Number(m[6])})).sort((a,b)=>a.symbol.localeCompare(b.symbol));}
function assemble(){const obs=parseObserved();const sentinel=demoDailySentinel();const rows=[];for(const o of obs){const expectedBest=Math.max(0,1-(o.spread*0.20+o.fee*0.01));const expectedMedian=Math.max(0,1-(o.spread*0.35+o.fee*0.015+o.drift*10));const expectedWorst=Math.max(0,1-(o.spread*0.55+o.fee*0.02+o.invalid*2));const observed=Math.max(0,1-(o.spread*0.40+o.fee*0.017+o.drift*12+o.invalid*3));const delta=observed-expectedMedian;const reasons=[];if(o.invalid>0.04) reasons.push('INVALID_BUDGET_HIT');if(o.spread>0.095) reasons.push('SPREAD_BUDGET_HIT');if(o.fee>6) reasons.push('FEE_BUDGET_HIT');const verdict=reasons.length? (delta<-0.05?'REJECT':'HOLD') : 'ACCEPT';rows.push({symbol:o.symbol,windows:o.windows,expectedBest,expectedMedian,expectedWorst,observed,delta,fee:o.fee,spread:o.spread,slippage:o.drift,latency_proxy:o.drift*1000,invalid:o.invalid,verdict,reasons:reasons.length?reasons:['WITHIN_BUDGET']});}
rows.sort((a,b)=>a.symbol.localeCompare(b.symbol));const fp=crypto.createHash('sha256').update(JSON.stringify({rows,sentinel})).digest('hex');return{rows,sentinel,fp};}
const a1=assemble(),a2=assemble();
if(a1.fp!==a2.fp||process.env.FORCE_E84_LEDGER_MISMATCH==='1') throw new Error('E84_LEDGER_DETERMINISM_FAIL');
if(update&&process.env.CI!=='true'){ensureDir(E84_ROOT);const lines=['# E84 PROFIT LEDGER',`- demo_daily_sentinel: ${a1.sentinel}`,`- ledger_fingerprint: ${a1.fp}`,'','| symbol | windows | expected_best | expected_median | expected_worst | observed | delta | fee | spread | slippage | latency_proxy | invalid | verdict | reason_codes |','|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|'];for(const r of a1.rows) lines.push(`| ${r.symbol} | ${r.windows} | ${r.expectedBest.toFixed(6)} | ${r.expectedMedian.toFixed(6)} | ${r.expectedWorst.toFixed(6)} | ${r.observed.toFixed(6)} | ${r.delta.toFixed(6)} | ${r.fee.toFixed(6)} | ${r.spread.toFixed(6)} | ${r.slippage.toFixed(8)} | ${r.latency_proxy.toFixed(3)} | ${r.invalid.toFixed(8)} | ${r.verdict} | ${r.reasons.join(',')} |`);writeMd(path.join(E84_ROOT,'PROFIT_LEDGER.md'),lines.join('\n'));}
quietLog(JSON.stringify({ledger_fingerprint:a1.fp},null,2));minimalLog(`verify:e84:profit:ledger PASSED ledger_fingerprint=${a1.fp}`);
