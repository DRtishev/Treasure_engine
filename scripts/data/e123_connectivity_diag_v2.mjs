#!/usr/bin/env node
import dns from 'node:dns/promises';
import { modeE123, writeMdAtomic } from '../verify/e123_lib.mjs';

const mode = modeE123();
const enabled = process.env.ENABLE_NET === '1' && process.env.I_UNDERSTAND_LIVE_RISK === '1';
const ts = new Date().toISOString();
const strict = new Set(['E_NET_BLOCKED','E_DNS_FAIL','E_TIMEOUT','E_TLS_FAIL','E_HTTP_NOK','E_WS_NO_EVENT','E_SCHEMA_FAIL','E_EMPTY','SKIPPED_BY_MODE','OK']);
const rows = [];
const push=(provider,channel,endpoint,ok,reason,rtt,group)=>{ if(!strict.has(reason)) reason='E_SCHEMA_FAIL'; rows.push({provider,channel,endpoint,ok,reason,rtt_ms:Math.round(rtt||0),ts_utc:ts,mode,quorum_group:group});};
async function dnsProbe(host,p,g){const t=Date.now();try{await dns.lookup(host);push(p,'DNS',host,true,'OK',Date.now()-t,g);}catch{push(p,'DNS',host,false,'E_DNS_FAIL',Date.now()-t,g);}}
async function httpProbe(url,p,g){const t=Date.now();try{const r=await fetch(url,{signal:AbortSignal.timeout(5000)});let ok=r.ok;let reason=ok?'OK':'E_HTTP_NOK';if(ok){const j=await r.json().catch(()=>null);if(!j){ok=false;reason='E_SCHEMA_FAIL';}}push(p,'REST',url,ok,reason,Date.now()-t,g);}catch(e){push(p,'REST',url,false,/timeout/i.test(String(e))?'E_TIMEOUT':'E_NET_BLOCKED',Date.now()-t,g);}}
async function wsProbe(url,p,g){const t=Date.now();try{const ws=new WebSocket(url);await new Promise((res,rej)=>{const tm=setTimeout(()=>rej(new Error('timeout')),5000);ws.onopen=()=>{clearTimeout(tm);ws.close();res();};ws.onerror=()=>{clearTimeout(tm);rej(new Error('ws'));};});push(p,'WS',url,true,'OK',Date.now()-t,g);}catch(e){push(p,'WS',url,false,/timeout/i.test(String(e))?'E_WS_NO_EVENT':'E_TLS_FAIL',Date.now()-t,g);}}

if(mode==='OFFLINE_ONLY') push('TESTNET','ALL','SKIPPED',false,'SKIPPED_BY_MODE',0,'G0');
else if(!enabled) push('TESTNET','ALL','DISABLED',false,'E_NET_BLOCKED',0,'G0');
else {
  await dnsProbe('api-testnet.bybit.com','BYBIT_TESTNET','G1');
  await httpProbe('https://api-testnet.bybit.com/v5/market/time','BYBIT_TESTNET','G1');
  await wsProbe('wss://stream-testnet.bybit.com/v5/public/linear','BYBIT_TESTNET','G1');
}
const restOk=rows.some(r=>r.channel==='REST'&&r.ok); const wsOk=rows.some(r=>r.channel==='WS'&&r.ok); const quorum=restOk&&wsOk;
writeMdAtomic('reports/evidence/E123/CONNECTIVITY_DIAG_V2.md',[
 '# E123 CONNECTIVITY DIAG V2',`- mode: ${mode}`,`- enabled: ${enabled}`,`- rest_ok: ${restOk}`,`- ws_ok: ${wsOk}`,`- quorum_success: ${quorum}`,
 '| provider | channel | endpoint | ok | reason_code | rtt_ms | ts_utc | mode | quorum_group |','|---|---|---|---|---|---:|---|---|---|',
 ...rows.map(r=>`| ${r.provider} | ${r.channel} | ${r.endpoint} | ${r.ok} | ${r.reason} | ${r.rtt_ms} | ${r.ts_utc} | ${r.mode} | ${r.quorum_group} |`)
].join('\n'));
if(mode==='ONLINE_REQUIRED'&&!quorum) process.exit(1);
