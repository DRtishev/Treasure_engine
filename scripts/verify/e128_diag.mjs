#!/usr/bin/env node
import dns from 'node:dns';
import dnsPromises from 'node:dns/promises';
import net from 'node:net';
import tls from 'node:tls';
import https from 'node:https';
import { WebSocket } from 'ws';
import { modeE128, writeMdAtomic, redactHash } from './e128_lib.mjs';

const mode=modeE128();
const enabled=process.env.ENABLE_NET==='1'&&process.env.I_UNDERSTAND_LIVE_RISK==='1';
const forceDown=process.env.FORCE_NET_DOWN==='1';
const forceIpv4=process.env.FORCE_IPV4==='1'&&!process.env.CI;
const preferIpv6=process.env.PREFER_IPV6==='1'&&!forceIpv4&&!process.env.CI;
if(forceIpv4) dns.setDefaultResultOrder('ipv4first');

const proxyRaw = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY || process.env.PROXY_URL || '';
let proxyScheme='NONE'; try{ proxyScheme=proxyRaw?new URL(proxyRaw).protocol.replace(':','').toUpperCase():'NONE'; }catch{ proxyScheme='INVALID'; }
const targets=[
  {provider:'BYBIT',channel:'REST',endpoint:'https://api-testnet.bybit.com/v5/market/time'},
  {provider:'BYBIT',channel:'WS',endpoint:'wss://stream-testnet.bybit.com/v5/public/linear'},
  {provider:'BINANCE',channel:'REST',endpoint:'https://api.binance.com/api/v3/time'},
  {provider:'BINANCE',channel:'WS',endpoint:'wss://stream.binance.com:9443/ws/btcusdt@trade'}
];

function restHttpsRequest(url,family){
  return new Promise((resolve,reject)=>{
    const u=new URL(url);
    const req=https.request({hostname:u.hostname,path:u.pathname+u.search,port:u.port||443,method:'GET',timeout:5000,family,headers:{accept:'application/json'}},(res)=>{
      const chunks=[]; res.on('data',(c)=>chunks.push(c)); res.on('end',()=>resolve({status:res.statusCode||0,body:Buffer.concat(chunks).toString('utf8'),date:res.headers.date||''}));
    });
    req.on('timeout',()=>{req.destroy(); reject(new Error('E_TIMEOUT'));});
    req.on('error',()=>reject(new Error('E_HTTP_STACK_FAIL')));
    req.end();
  });
}

async function probe(t){
  const start=Date.now();
  const out={dns_ok:false,tcp_ok:false,tls_ok:false,http_ok:false,ws_handshake_ok:false,ws_event_ok:false,handshake_rtt_ms:'NA',first_event_rtt_ms:'NA',rtt_ms:0,bytes:0,reason_code:'E_NET_BLOCKED',rest_stack:'NA',family:'auto',clock_skew_ms:'NA'};
  if(mode==='OFFLINE_ONLY'||!enabled||forceDown){ out.rtt_ms=Date.now()-start; return out; }
  const u=new URL(t.endpoint); const host=u.hostname; const port=Number(u.port||((u.protocol==='https:'||u.protocol==='wss:')?443:80));
  const family=forceIpv4?4:(preferIpv6?6:0); out.family=family===4?'ipv4':family===6?'ipv6':'auto';
  try{
    const lookup = family===6 ? await dnsPromises.resolve6(host) : family===4 ? await dnsPromises.resolve4(host) : await dnsPromises.lookup(host);
    out.dns_ok = Array.isArray(lookup)?lookup.length>0:Boolean(lookup?.address);
    if(!out.dns_ok) throw new Error('E_DNS_FAIL');
    await new Promise((resolve,reject)=>{ const s=net.connect({host,port,family,timeout:4000},()=>{out.tcp_ok=true; s.destroy(); resolve();}); s.on('timeout',()=>{s.destroy(); reject(new Error(family===6?'E_IPV6_BLACKHOLE':'E_TCP_FAIL'));}); s.on('error',()=>reject(new Error(family===4?'E_IPV4_BLOCKED':'E_TCP_FAIL')));});
    await new Promise((resolve,reject)=>{ const s=tls.connect({host,port,servername:host,family,timeout:4000},()=>{out.tls_ok=true; s.destroy(); resolve();}); s.on('timeout',()=>{s.destroy(); reject(new Error('E_TLS_FAIL'));}); s.on('error',()=>reject(new Error('E_TLS_FAIL'))); });

    if(t.channel==='REST'){
      let res;
      try{
        const r=await fetch(t.endpoint,{method:'GET',headers:{accept:'application/json'}});
        const body=await r.text();
        res={status:r.status,body,date:r.headers.get('date')||''};
        out.rest_stack='fetch';
      }catch{ out.rest_stack='https_request'; res=await restHttpsRequest(t.endpoint,family); }
      out.bytes=Buffer.byteLength(res.body); out.http_ok=res.status>=200&&res.status<300;
      if(res.date){ out.clock_skew_ms=Math.abs(Date.now()-Date.parse(res.date)); }
      const html=/<html|<head|<body|<title/i.test(res.body);
      if(res.status===200&&html) out.reason_code='E_CAPTIVE_PORTAL';
      else if(!out.http_ok) out.reason_code=res.status>=500?'E_HTTP_5XX':'E_HTTP_4XX';
      else { try{ JSON.parse(res.body); out.reason_code='E_OK'; }catch{ out.reason_code='E_BAD_SCHEMA'; }}
    }else{
      await new Promise((resolve,reject)=>{
        const wsStart=Date.now();
        const ws=new WebSocket(t.endpoint,{handshakeTimeout:5000,family});
        const timer=setTimeout(()=>{ws.terminate(); reject(new Error(out.ws_handshake_ok?'E_WS_HANDSHAKE_OK_BUT_NO_EVENT':'E_WS_HANDSHAKE_FAIL'));},7000);
        ws.once('open',()=>{ out.ws_handshake_ok=true; out.handshake_rtt_ms=Date.now()-wsStart; });
        ws.once('message',(d)=>{ out.ws_event_ok=true; out.first_event_rtt_ms=Date.now()-wsStart; out.bytes+=Buffer.byteLength(String(d)); out.reason_code='E_OK'; clearTimeout(timer); ws.close(); resolve(); });
        ws.once('error',()=>{ clearTimeout(timer); reject(new Error('E_WS_HANDSHAKE_FAIL')); });
      });
      out.http_ok=true;
    }
  }catch(e){
    const r=String(e.message||'E_TIMEOUT');
    out.reason_code=['E_DNS_FAIL','E_TCP_FAIL','E_TLS_FAIL','E_TIMEOUT','E_HTTP_4XX','E_HTTP_5XX','E_BAD_SCHEMA','E_WS_HANDSHAKE_FAIL','E_WS_HANDSHAKE_OK_BUT_NO_EVENT','E_CAPTIVE_PORTAL','E_IPV6_BLACKHOLE','E_IPV4_BLOCKED'].includes(r)?r:(out.rest_stack==='https_request'?'E_TLS_STACK_FAIL':'E_TIMEOUT');
  }
  if(out.clock_skew_ms!=='NA' && Number(out.clock_skew_ms)>30000 && out.reason_code==='E_OK') out.reason_code='E_CLOCK_SKEW_RISK';
  out.rtt_ms=Date.now()-start;
  return out;
}

const rows=[];
for(const t of targets){ rows.push({target_id:`${t.provider}-${t.channel}`,...t,url_hash:redactHash(t.endpoint).slice(0,16),...(await probe(t))}); }
rows.sort((a,b)=>a.provider.localeCompare(b.provider)||a.channel.localeCompare(b.channel)||a.target_id.localeCompare(b.target_id));
const restOk=rows.some((r)=>r.channel==='REST'&&r.reason_code==='E_OK');
const wsOk=rows.some((r)=>r.channel==='WS'&&r.ws_event_ok);
const skews=rows.map((r)=>r.clock_skew_ms).filter((v)=>v!=='NA').map(Number);
const skewMin=skews.length?Math.min(...skews):'NA'; const skewMax=skews.length?Math.max(...skews):'NA';

const diagDoc=[
  '# E128 EGRESS DIAG V7',
  `- mode: ${mode}`,
  `- force_ipv4_effective: ${forceIpv4}`,
  `- prefer_ipv6_effective: ${preferIpv6}`,
  `- proxy_scheme: ${proxyScheme}`,
  `- proxy_hash: ${proxyRaw?redactHash(proxyRaw):'NONE'}`,
  '| target_id | provider | channel | endpoint | url_hash | family | rest_stack | dns_ok | tcp_ok | tls_ok | http_ok | ws_handshake_ok | ws_event_ok | handshake_rtt_ms | first_event_rtt_ms | rtt_ms | bytes | reason_code |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|---:|---:|---:|---:|---|',
  ...rows.map((r)=>`| ${r.target_id} | ${r.provider} | ${r.channel} | ${r.endpoint} | ${r.url_hash} | ${r.family} | ${r.rest_stack} | ${r.dns_ok} | ${r.tcp_ok} | ${r.tls_ok} | ${r.http_ok} | ${r.ws_handshake_ok} | ${r.ws_event_ok} | ${r.handshake_rtt_ms} | ${r.first_event_rtt_ms} | ${r.rtt_ms} | ${r.bytes} | ${r.reason_code} |`),
  `- rest_success: ${restOk}`,
  `- ws_success: ${wsOk}`
].join('\n');

const timeDoc=['# E128 TIME SYNC',`- skew_min_ms: ${skewMin}`,`- skew_max_ms: ${skewMax}`,`- skew_risk: ${skewMax!=='NA'&&Number(skewMax)>30000}`].join('\n');
const matrixDoc=['# E128 TRANSPORT MATRIX','| provider | endpoint | channel | stack | ws_event | reason_code |','|---|---|---|---|---|---|',...rows.map((r)=>`| ${r.provider} | ${r.endpoint} | ${r.channel} | ${r.rest_stack} | ${r.ws_event_ok} | ${r.reason_code} |`)].join('\n');

if(process.env.E128_DIAG_WRITE==='1'||process.env.UPDATE_E128_EVIDENCE==='1'){
  writeMdAtomic('reports/evidence/E128/EGRESS_DIAG_V7.md',diagDoc);
  writeMdAtomic('reports/evidence/E128/TIME_SYNC.md',timeDoc);
  writeMdAtomic('reports/evidence/E128/TRANSPORT_MATRIX.md',matrixDoc);
}else{
  process.stdout.write(`${diagDoc}\n\n${timeDoc}\n\n${matrixDoc}\n`);
}
if(mode==='ONLINE_REQUIRED'&&(!restOk||!wsOk)) process.exit(1);
