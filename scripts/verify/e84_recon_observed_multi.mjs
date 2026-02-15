#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ingestE78Recon } from '../../core/edge/e78_recon_coverage.mjs';
import { E84_ROOT, ensureDir, quietLog, minimalLog } from './e84_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E84_EVIDENCE==='1';
if(process.env.CI==='true'&&update) throw new Error('UPDATE_E84_EVIDENCE forbidden in CI');
const source=path.resolve(process.env.RECON_OBSERVED_SOURCE||'core/edge/fixtures/e80_recon_observed_multi.csv');
const recon=ingestE78Recon(source);
const bySym=new Map();
for(const r of recon.coverageRows){const x=bySym.get(r.symbol)||{symbol:r.symbol,windows:new Set(),accepted:0,rejected:0};x.windows.add(r.window);x.accepted+=r.accepted_rows;x.rejected+=r.rejected_rows;bySym.set(r.symbol,x);}
const rowsRaw=fs.readFileSync(source,'utf8').trim().split(/\r?\n/).slice(1).map((l)=>l.split(','));
const stats=new Map();
for(const c of rowsRaw){const s=c[0];if(!stats.has(s)) stats.set(s,{spread:[],fee:[],drift:[]});const st=stats.get(s);const exp=Number(c[4]),fill=Number(c[5]);st.spread.push(Number(c[7]));st.fee.push(Number(c[6]));st.drift.push(Math.abs(fill-exp)/exp);}
const summary=[...bySym.values()].sort((a,b)=>a.symbol.localeCompare(b.symbol)).map((x)=>{const st=stats.get(x.symbol);const avg=(arr)=>arr.reduce((p,q)=>p+q,0)/(arr.length||1);return{symbol:x.symbol,windows_count:x.windows.size,invalid_row_rate:(x.accepted+x.rejected)?x.rejected/(x.accepted+x.rejected):0,drift_proxy:avg(st.drift),spread_p50:[...st.spread].sort((a,b)=>a-b)[Math.floor(st.spread.length/2)],fee_avg:avg(st.fee)};});
const fp=crypto.createHash('sha256').update(JSON.stringify({recon_fingerprint:recon.fingerprint,summary})).digest('hex');
if(update&&process.env.CI!=='true'){ensureDir(E84_ROOT);const lines=['# E84 EXEC RECON OBSERVED MULTI',`- source_file: ${recon.source_file}`,`- source_sha256: ${recon.source_sha}`,`- recon_fingerprint: ${recon.fingerprint}`,`- coverage_report_fingerprint: ${fp}`,'','| symbol | windows_count | invalid_row_rate | drift_proxy | spread_p50 | fee_avg |','|---|---:|---:|---:|---:|---:|'];for(const s of summary) lines.push(`| ${s.symbol} | ${s.windows_count} | ${s.invalid_row_rate.toFixed(8)} | ${s.drift_proxy.toFixed(8)} | ${s.spread_p50.toFixed(6)} | ${s.fee_avg.toFixed(6)} |`);writeMd(path.join(E84_ROOT,'EXEC_RECON_OBSERVED_MULTI.md'),lines.join('\n'));}
quietLog(JSON.stringify({recon_fingerprint:recon.fingerprint,coverage_report_fingerprint:fp},null,2));
minimalLog(`verify:e84:recon PASSED coverage_report_fingerprint=${fp}`);
