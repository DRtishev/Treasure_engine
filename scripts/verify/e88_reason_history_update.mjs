#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import { E88_STATE_PATH, readAnchorBundle, minimalLog } from './e88_lib.mjs';
import { writeMd } from './e66_lib.mjs';

if(process.env.CI==='true') throw new Error('UPDATE_E88_STATE forbidden in CI');
if(process.env.UPDATE_E88_STATE!=='1') throw new Error('UPDATE_E88_STATE=1 required');

const canary=fs.readFileSync('reports/evidence/E86/RUNS_EDGE_CANARY_X2.md','utf8');
const rows=[...canary.matchAll(/^\|\s([^|]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([0-9]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|\s([0-9.]+)\s\|$/gm)]
  .map((m)=>({symbol:m[1].trim(),stage:m[2].trim(),promotion:m[3].trim(),reasons:m[4].trim(),windows:Number(m[5]),invalid:Number(m[6]),spread:Number(m[7]),fee:Number(m[8]),drift:Number(m[9])}))
  .filter((r)=>r.symbol!=='symbol')
  .sort((a,b)=>a.symbol.localeCompare(b.symbol));
const dateUtc=String(process.env.E88_DATE_UTC||new Date(Number(process.env.SOURCE_DATE_EPOCH||'1700000000')*1000).toISOString().slice(0,10));
const anchors=readAnchorBundle();
const anchorsDigest=crypto.createHash('sha256').update(JSON.stringify(anchors)).digest('hex');

const existing=fs.existsSync(E88_STATE_PATH)?[...fs.readFileSync(E88_STATE_PATH,'utf8').matchAll(/^\|\s(\d{4}-\d{2}-\d{2})\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([^|]+)\s\|\s([a-f0-9]{64})\s\|\s([a-f0-9]{64})\s\|$/gm)].map((m)=>({date_utc:m[1],symbol:m[2].trim(),stage:m[3].trim(),verdict:m[4].trim(),reason_codes:m[5].trim(),metrics_digest:m[6],anchors_digest:m[7]})):[];
const keep=existing.filter((r)=>!(r.date_utc===dateUtc&&rows.some((x)=>x.symbol===r.symbol)));
const append=rows.map((r)=>{const verdict=r.promotion==='PASS'?'ALLOW':(r.reasons.includes('WINDOWS_LT_MIN')?'HOLD_STRICT':'REJECT_ALL');const metricsDigest=crypto.createHash('sha256').update(JSON.stringify({windows:r.windows,invalid:r.invalid.toFixed(8),spread:r.spread.toFixed(6),fee:r.fee.toFixed(6),drift:r.drift.toFixed(8)})).digest('hex');return {date_utc:dateUtc,symbol:r.symbol,stage:r.stage,verdict,reason_codes:r.reasons,metrics_digest:metricsDigest,anchors_digest:anchorsDigest};});
const merged=[...keep,...append].sort((a,b)=>a.date_utc.localeCompare(b.date_utc)||a.symbol.localeCompare(b.symbol));
const md=['# E88 Reason History State','','| date_utc | symbol | stage | verdict | reason_codes | metrics_digest | anchors_digest |','|---|---|---|---|---|---|---|',...merged.map((r)=>`| ${r.date_utc} | ${r.symbol} | ${r.stage} | ${r.verdict} | ${r.reason_codes} | ${r.metrics_digest} | ${r.anchors_digest} |`)].join('\n');
writeMd(E88_STATE_PATH,md);
minimalLog(`verify:e88:reason-history:update PASSED rows=${append.length} date_utc=${dateUtc}`);
