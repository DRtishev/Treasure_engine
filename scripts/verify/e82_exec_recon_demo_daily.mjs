#!/usr/bin/env node
import https from 'node:https';
import path from 'node:path';
import crypto from 'node:crypto';
import { E82_ROOT, ensureDir, minimalLog } from './e82_lib.mjs';
import { writeMd } from './e66_lib.mjs';

if(process.env.CI==='true') throw new Error('daily demo recon forbidden in CI');
for(const k of ['ENABLE_DEMO_ADAPTER','ALLOW_MANUAL_RECON','UPDATE_E82_EVIDENCE']) if(process.env[k]!=='1') throw new Error(`${k}=1 required`);
for(const k of ['DEMO_API_KEY','DEMO_API_SECRET']) if(!String(process.env[k]||'').trim()) throw new Error(`${k} required`);
const symbols=String(process.env.DEMO_SYMBOLS||'BTCUSDT,ETHUSDT,SOLUSDT').split(',').map((s)=>s.trim()).filter(Boolean);
if(symbols.length===0) throw new Error('DEMO_SYMBOLS empty');

function fetchSymbol(symbol){
  const host=process.env.DEMO_HOST||'postman-echo.com';
  const reqPath=(process.env.DEMO_PATH_TEMPLATE||'/get?symbol={symbol}&limit=3').replace('{symbol}',encodeURIComponent(symbol));
  return new Promise((resolve,reject)=>{
    const req=https.request({host,path:reqPath,method:'GET',headers:{'x-demo-key':process.env.DEMO_API_KEY,'x-demo-secret':process.env.DEMO_API_SECRET}},(res)=>{
      let body='';res.on('data',(c)=>body+=c);res.on('end',()=>{if(res.statusCode<200||res.statusCode>=300) return reject(new Error(`demo_http_${symbol}_${res.statusCode}`)); try{resolve({symbol,host,reqPath,payload:JSON.parse(body)});}catch{reject(new Error(`demo_json_parse_fail_${symbol}`));}});
    });
    req.on('error',reject);
    req.end();
  });
}

const rows=[];
for(const symbol of symbols){
  const {host,reqPath,payload}=await fetchSymbol(symbol);
  const redacted=JSON.stringify(payload,(k,v)=>/key|secret|token|authorization/i.test(k)?'REDACTED':v);
  const canonical=JSON.stringify(JSON.parse(redacted));
  const payloadHash=crypto.createHash('sha256').update(canonical).digest('hex');
  const metrics={symbol,host,path:reqPath,arg_keys:Object.keys(payload.args||{}).sort().join(','),header_count:Object.keys(payload.headers||{}).length,url_len:String(payload.url||'').length};
  rows.push({symbol,metrics,payloadHash});
}
rows.sort((a,b)=>a.symbol.localeCompare(b.symbol));
const fp=crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');
const mdLines=['# E82 EXEC RECON DEMO DAILY',`- symbols: ${rows.map((r)=>r.symbol).join(',')}`,`- daily_recon_fingerprint: ${fp}`,'','| symbol | arg_keys | header_count | url_len | payload_hash_sha256 |','|---|---|---:|---:|---|'];
for(const r of rows) mdLines.push(`| ${r.symbol} | ${r.metrics.arg_keys} | ${r.metrics.header_count} | ${r.metrics.url_len} | ${r.payloadHash} |`);
const md=mdLines.join('\n');
const guard=/(AKIA[0-9A-Z]{16}|sk_[a-zA-Z0-9]{20,}|-----BEGIN|api[_-]?key\s*[:=]\s*[A-Za-z0-9\-_]{8,}|secret\s*[:=]\s*[A-Za-z0-9\-_]{8,})/i;
if(guard.test(md)) throw new Error('NO_SECRETS_GUARD_FAIL');
ensureDir(E82_ROOT);
writeMd(path.join(E82_ROOT,'EXEC_RECON_DEMO_DAILY.md'),md);
minimalLog(`verify:exec:recon:daily PASSED daily_recon_fingerprint=${fp}`);
