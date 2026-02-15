#!/usr/bin/env node
import https from 'node:https';
import path from 'node:path';
import crypto from 'node:crypto';
import { E81_ROOT, ensureDir, minimalLog } from './e81_lib.mjs';
import { writeMd } from './e66_lib.mjs';

if(process.env.CI==='true') throw new Error('manual recon demo forbidden in CI');
for(const k of ['ENABLE_DEMO_ADAPTER','ALLOW_MANUAL_RECON','UPDATE_E81_EVIDENCE']) if(process.env[k]!=='1') throw new Error(`${k}=1 required`);
for(const k of ['DEMO_API_KEY','DEMO_API_SECRET']) if(!String(process.env[k]||'').trim()) throw new Error(`${k} required`);

const host=process.env.DEMO_HOST||'postman-echo.com';
const reqPath=process.env.DEMO_PATH||'/get?symbol=BTCUSDT&limit=1';
function fetchJson(){return new Promise((resolve,reject)=>{const req=https.request({host,path:reqPath,method:'GET',headers:{'x-demo-key':process.env.DEMO_API_KEY,'x-demo-secret':process.env.DEMO_API_SECRET}},(res)=>{let body='';res.on('data',(c)=>body+=c);res.on('end',()=>{if(res.statusCode<200||res.statusCode>=300) return reject(new Error(`demo_http_${res.statusCode}`)); try{resolve(JSON.parse(body));}catch{reject(new Error('demo_json_parse_fail'));}});});req.on('error',reject);req.end();});}

const payload=await fetchJson();
const redacted=JSON.stringify(payload,(k,v)=>/key|secret|token|authorization/i.test(k)?'REDACTED':v);
const normalized={has_args:Boolean(payload.args),arg_keys:Object.keys(payload.args||{}).sort(),header_count:Object.keys(payload.headers||{}).length,url_len:String(payload.url||'').length};
const payloadSha=crypto.createHash('sha256').update(redacted).digest('hex');
const guard=/(AKIA[0-9A-Z]{16}|sk_[a-zA-Z0-9]{20,}|-----BEGIN|api[_-]?key\s*[:=]\s*[A-Za-z0-9\-_]{8,}|secret\s*[:=]\s*[A-Za-z0-9\-_]{8,})/i;
ensureDir(E81_ROOT);
const md=['# E81 EXEC RECON DEMO MICROFILL','- mode: DEMO_ADAPTER_MANUAL','- ci_safe: true',`- demo_host: ${host}`,`- demo_path: ${reqPath}`,`- normalized_metrics: ${JSON.stringify(normalized)}`,`- redacted_payload_sha256: ${payloadSha}`].join('\n');
if(guard.test(md)) throw new Error('NO_SECRETS_GUARD_FAIL');
writeMd(path.join(E81_ROOT,'EXEC_RECON_DEMO_MICROFILL.md'),md);
minimalLog(`verify:exec:recon:demo PASSED redacted_payload_sha256=${payloadSha}`);
