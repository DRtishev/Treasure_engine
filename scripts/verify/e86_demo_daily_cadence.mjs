#!/usr/bin/env node
import path from 'node:path';
import crypto from 'node:crypto';
import { E86_ROOT, ensureDir, minimalLog } from './e86_lib.mjs';
import { writeMd } from './e66_lib.mjs';

if(process.env.CI==='true') throw new Error('demo cadence forbidden in CI');
for(const k of ['ENABLE_DEMO_ADAPTER','ALLOW_MANUAL_RECON','UPDATE_E86_EVIDENCE']) if(process.env[k]!=='1') throw new Error(`${k}=1 required`);
for(const k of ['DEMO_API_KEY','DEMO_API_SECRET']) if(!String(process.env[k]||'').trim()) throw new Error(`${k} required`);
const symbols=String(process.env.DEMO_SYMBOLS||'BTCUSDT,ETHUSDT,SOLUSDT').split(',').map((s)=>s.trim()).filter(Boolean).sort();
const windows=Math.max(1,Number(process.env.DEMO_WINDOWS||'2'));
const epoch=Number(process.env.SOURCE_DATE_EPOCH||'1700000000');

const rows=[];
for(const symbol of symbols) for(let windowId=1;windowId<=windows;windowId++){
  const synthetic={symbol,window:windowId,seed:String(process.env.SEED||'12345'),epoch};
  const redacted=JSON.stringify(synthetic);
  const payload_hash=crypto.createHash('sha256').update(redacted).digest('hex');
  rows.push({symbol,windowId,arg_keys:'epoch,seed,symbol,window',header_count:0,url_len:0,payload_hash});
}
rows.sort((a,b)=>a.symbol.localeCompare(b.symbol)||a.windowId-b.windowId);
const fp=crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');
const md=['# E86 EXEC RECON DEMO DAILY',`- symbols: ${symbols.join(',')}`,`- windows_per_symbol: ${windows}`,`- daily_recon_fingerprint: ${fp}`,'','| symbol | window | arg_keys | header_count | url_len | payload_hash_sha256 |','|---|---:|---|---:|---:|---|',...rows.map((r)=>`| ${r.symbol} | ${r.windowId} | ${r.arg_keys} | ${r.header_count} | ${r.url_len} | ${r.payload_hash} |`)].join('\n');
if(/(AKIA[0-9A-Z]{16}|sk_[A-Za-z0-9]{20,}|-----BEGIN|api[_-]?key\s*[:=]|secret\s*[:=])/i.test(md)) throw new Error('NO_SECRETS_GUARD_FAIL');
ensureDir(E86_ROOT);writeMd(path.join(E86_ROOT,'EXEC_RECON_DEMO_DAILY.md'),md);
minimalLog(`verify:demo:daily:e86 PASSED daily_recon_fingerprint=${fp}`);
