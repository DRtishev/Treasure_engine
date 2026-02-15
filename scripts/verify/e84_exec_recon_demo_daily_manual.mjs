#!/usr/bin/env node
import https from 'node:https';
import path from 'node:path';
import crypto from 'node:crypto';
import { E84_ROOT, ensureDir, minimalLog } from './e84_lib.mjs';
import { writeMd } from './e66_lib.mjs';

if(process.env.CI==='true') throw new Error('demo daily manual forbidden in CI');
for(const k of ['ENABLE_DEMO_ADAPTER','ALLOW_MANUAL_RECON','UPDATE_E84_EVIDENCE']) if(process.env[k]!=='1') throw new Error(`${k}=1 required`);
for(const k of ['DEMO_API_KEY','DEMO_API_SECRET']) if(!String(process.env[k]||'').trim()) throw new Error(`${k} required`);
const symbols=String(process.env.DEMO_SYMBOLS||'BTCUSDT,ETHUSDT,SOLUSDT').split(',').map((s)=>s.trim()).filter(Boolean).sort();
const windows=Math.max(1,Number(process.env.DEMO_WINDOWS||'2'));
function fetchSW(symbol,windowId){const host=process.env.DEMO_HOST||'postman-echo.com';const reqPath=(process.env.DEMO_PATH_TEMPLATE||'/get?symbol={symbol}&window={window}&limit=1').replace('{symbol}',encodeURIComponent(symbol)).replace('{window}',String(windowId));return new Promise((resolve,reject)=>{const req=https.request({host,path:reqPath,method:'GET',headers:{'x-demo-key':process.env.DEMO_API_KEY,'x-demo-secret':process.env.DEMO_API_SECRET}},(res)=>{let body='';res.on('data',(c)=>body+=c);res.on('end',()=>{if(res.statusCode<200||res.statusCode>=300) return reject(new Error(`demo_http_${symbol}_${windowId}_${res.statusCode}`));try{resolve({symbol,windowId,payload:JSON.parse(body)});}catch{reject(new Error(`demo_json_parse_fail_${symbol}_${windowId}`));}});});req.on('error',reject);req.end();});}
const rows=[];for(const symbol of symbols) for(let windowId=1;windowId<=windows;windowId++){const {payload}=await fetchSW(symbol,windowId);const redacted=JSON.stringify(payload,(k,v)=>/key|secret|token|authorization/i.test(k)?'REDACTED':v);const payloadHash=crypto.createHash('sha256').update(JSON.stringify(JSON.parse(redacted))).digest('hex');rows.push({symbol,windowId,arg_keys:Object.keys(payload.args||{}).sort().join(','),header_count:Object.keys(payload.headers||{}).length,url_len:String(payload.url||'').length,payloadHash});}
rows.sort((a,b)=>a.symbol.localeCompare(b.symbol)||a.windowId-b.windowId);
const fp=crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');
const md=['# E84 EXEC RECON DEMO DAILY',`- symbols: ${symbols.join(',')}`,`- windows_per_symbol: ${windows}`,`- daily_recon_fingerprint: ${fp}`,'','| symbol | window | arg_keys | header_count | url_len | payload_hash_sha256 |','|---|---:|---|---:|---:|---|',...rows.map((r)=>`| ${r.symbol} | ${r.windowId} | ${r.arg_keys} | ${r.header_count} | ${r.url_len} | ${r.payloadHash} |`)].join('\n');
const guard=/(AKIA[0-9A-Z]{16}|sk_[a-zA-Z0-9]{20,}|-----BEGIN|api[_-]?key\s*[:=]\s*[A-Za-z0-9\-_]{8,}|secret\s*[:=]\s*[A-Za-z0-9\-_]{8,})/i;
if(guard.test(md)) throw new Error('NO_SECRETS_GUARD_FAIL');
ensureDir(E84_ROOT);writeMd(path.join(E84_ROOT,'EXEC_RECON_DEMO_DAILY.md'),md);
minimalLog(`verify:exec:recon:demo:daily:e84 PASSED daily_recon_fingerprint=${fp}`);
