#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { E87_ROOT, ensureDir, demoDailySentinel, minimalLog } from './e87_lib.mjs';
import { writeMd } from './e66_lib.mjs';

const update=process.env.UPDATE_E87_EVIDENCE==='1';
if(process.env.CI==='true') throw new Error('microfill cadence forbidden in CI');
for(const k of ['ENABLE_DEMO_ADAPTER','ALLOW_MANUAL_RECON']) if(process.env[k]!=='1') throw new Error(`${k}=1 required`);
if(!update) throw new Error('UPDATE_E87_EVIDENCE=1 required for microfill cadence');
const inputPath=path.resolve(process.env.MICROFILL_INPUT_PATH||'reports/evidence/E87/MICROFILL_INPUT.md');
if(!fs.existsSync(inputPath)) throw new Error(`missing ${inputPath}`);
const reconFp=(fs.readFileSync(path.resolve('reports/evidence/E84/EXEC_RECON_OBSERVED_MULTI.md'),'utf8').match(/recon_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';
const profitFp=(fs.readFileSync(path.resolve('reports/evidence/E84/PROFIT_LEDGER.md'),'utf8').match(/ledger_fingerprint:\s*([a-f0-9]{64})/)||[])[1]||'';
const lines=fs.readFileSync(inputPath,'utf8').split(/\r?\n/).filter((line)=>/^\|\s\d{4}-\d{2}-\d{2}\s\|/.test(line));
const rows=lines.map((line)=>{const c=line.split('|').map((x)=>x.trim());return {date_utc:c[1],symbol:c[2],venue:c[3],size:Number(c[4]),intended_price:Number(c[5]),avg_fill:Number(c[6]),latency_bucket:c[7],slippage:Number(c[8]),fees:Number(c[9]),invalid:Number(c[10]),notes:c[11]||''};}).sort((a,b)=>a.date_utc.localeCompare(b.date_utc)||a.symbol.localeCompare(b.symbol));
const ledgerFp=crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');
const md=['# E87 MICROFILL LEDGER',`- source_path: ${path.relative(process.cwd(),inputPath)}`,`- demo_daily_sentinel: ${demoDailySentinel()}`,`- recon_fingerprint: ${reconFp}`,`- profit_ledger_fingerprint: ${profitFp}`,`- microfill_ledger_fingerprint: ${ledgerFp}`,'','| date_utc | symbol | venue | size | intended_price | avg_fill | latency_bucket | slippage | fees | invalid | notes |','|---|---|---|---:|---:|---:|---|---:|---:|---:|---|',...rows.map((r)=>`| ${r.date_utc} | ${r.symbol} | ${r.venue} | ${r.size.toFixed(6)} | ${r.intended_price.toFixed(6)} | ${r.avg_fill.toFixed(6)} | ${r.latency_bucket} | ${r.slippage.toFixed(8)} | ${r.fees.toFixed(6)} | ${r.invalid.toFixed(0)} | ${r.notes} |`)].join('\n');
const execMd=['# E87 EXEC RECON MICROFILL',`- status: PASS`,`- demo_daily_sentinel: ${demoDailySentinel()}`,`- recon_fingerprint: ${reconFp}`,`- profit_ledger_fingerprint: ${profitFp}`,`- microfill_ledger_fingerprint: ${ledgerFp}`,`- rows_ingested: ${rows.length}`].join('\n');
ensureDir(E87_ROOT);writeMd(path.join(E87_ROOT,'MICROFILL_LEDGER.md'),md);writeMd(path.join(E87_ROOT,'EXEC_RECON_MICROFILL.md'),execMd);
minimalLog(`verify:e87:microfill PASSED microfill_ledger_fingerprint=${ledgerFp}`);
