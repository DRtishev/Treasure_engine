#!/usr/bin/env node
import dns from 'node:dns';
import dnsPromises from 'node:dns/promises';
import net from 'node:net';
import tls from 'node:tls';
import crypto from 'node:crypto';
import { WebSocket } from 'ws';
import { modeE127, writeMdAtomic, redactHash } from './e127_lib.mjs';

const mode = modeE127();
const enabled = process.env.ENABLE_NET==='1' && process.env.I_UNDERSTAND_LIVE_RISK==='1';
const forceDown = process.env.FORCE_NET_DOWN==='1';
const forceIpv4 = process.env.FORCE_IPV4==='1' && !process.env.CI;
if (forceIpv4) dns.setDefaultResultOrder('ipv4first');

const targets = [
  { provider:'BYBIT', channel:'REST', endpoint:'https://api-testnet.bybit.com/v5/market/time' },
  { provider:'BYBIT', channel:'WS', endpoint:'wss://stream-testnet.bybit.com/v5/public/linear' },
  { provider:'BINANCE', channel:'REST', endpoint:'https://api.binance.com/api/v3/time' },
  { provider:'BINANCE', channel:'WS', endpoint:'wss://stream.binance.com:9443/ws/btcusdt@trade' }
];

function off(reason='E_NET_BLOCKED'){
  return {dns_ok:false,tcp_ok:false,tls_ok:false,http_ok:false,ws_handshake_ok:false,ws_event_ok:false,rtt_ms:0,bytes:0,reason_code:reason,time_sync_ms:'NA'};
}

async function probe(target){
  const started = Date.now();
  if (!enabled || forceDown || mode==='OFFLINE_ONLY') return off(forceDown?'E_NET_BLOCKED':'E_NET_BLOCKED');
  let dnsOk=false,tcpOk=false,tlsOk=false,httpOk=false,wsHandshake=false,wsEvent=false,bytes=0,reason='E_OK',timeSyncMs='NA';
  try {
    const u = new URL(target.endpoint);
    const host = u.hostname;
    const port = Number(u.port || (u.protocol==='https:'||u.protocol==='wss:' ? 443 : 80));
    const lookup = forceIpv4 ? await dnsPromises.resolve4(host) : await dnsPromises.lookup(host);
    dnsOk = Array.isArray(lookup) ? lookup.length > 0 : Boolean(lookup?.address);
    if (!dnsOk) throw new Error('E_DNS_FAIL');

    await new Promise((resolve,reject)=>{
      const s=net.connect({host,port,family:forceIpv4?4:0,timeout:3500},()=>{tcpOk=true; s.destroy(); resolve();});
      s.on('timeout',()=>{s.destroy(); reject(new Error('E_TCP_FAIL'));});
      s.on('error',()=>reject(new Error('E_TCP_FAIL')));
    });

    if (u.protocol==='https:'||u.protocol==='wss:'){
      await new Promise((resolve,reject)=>{
        const s=tls.connect({host,port,servername:host,family:forceIpv4?4:0,timeout:3500},()=>{tlsOk=true; s.destroy(); resolve();});
        s.on('error',()=>reject(new Error('E_TLS_FAIL')));
        s.on('timeout',()=>{s.destroy(); reject(new Error('E_TLS_FAIL'));});
      });
    }

    if (target.channel==='REST'){
      const res = await fetch(target.endpoint, { method:'GET', headers:{accept:'application/json'} });
      const text = await res.text();
      bytes = Buffer.byteLength(text);
      httpOk = res.ok;
      const hasHtml = /<html|<head|<body|<title/i.test(text);
      if (res.status===200 && hasHtml){ reason='E_CAPTIVE_PORTAL'; }
      else if (!res.ok && res.status>=500) reason='E_HTTP_5XX';
      else if (!res.ok && res.status>=400) reason='E_HTTP_4XX';
      else if (!text.trim()) reason='E_EMPTY';
      else {
        try { JSON.parse(text); reason='E_OK'; } catch { reason='E_BAD_SCHEMA'; }
      }
      const dateHeader = res.headers.get('date');
      if (dateHeader){ timeSyncMs = Math.abs(Date.now() - Date.parse(dateHeader)); }
    } else {
      await new Promise((resolve,reject)=>{
        const ws = new WebSocket(target.endpoint, { handshakeTimeout: 4000, family: forceIpv4?4:0 });
        const timer = setTimeout(()=>{ ws.terminate(); reject(new Error('E_WS_NO_EVENT')); }, 5000);
        ws.once('open',()=>{ wsHandshake=true; });
        ws.once('message',(d)=>{ bytes += Buffer.byteLength(String(d)); wsEvent=true; clearTimeout(timer); ws.close(); resolve(); });
        ws.once('error',()=>{ clearTimeout(timer); reject(new Error('E_WS_HANDSHAKE_FAIL')); });
        ws.once('close',()=>{ if (wsEvent) return; if (!wsHandshake) { clearTimeout(timer); reject(new Error('E_WS_HANDSHAKE_FAIL')); } });
      });
      reason = wsEvent ? 'E_OK' : 'E_WS_NO_EVENT';
      httpOk = true;
    }
  } catch (e) {
    reason = String(e.message || 'E_TIMEOUT');
    if (!['E_DNS_FAIL','E_TCP_FAIL','E_TLS_FAIL','E_HTTP_4XX','E_HTTP_5XX','E_BAD_SCHEMA','E_EMPTY','E_WS_NO_EVENT','E_WS_HANDSHAKE_FAIL','E_CAPTIVE_PORTAL','E_OK'].includes(reason)) reason='E_TIMEOUT';
  }
  return { dns_ok:dnsOk, tcp_ok:tcpOk, tls_ok:tlsOk, http_ok:httpOk, ws_handshake_ok:wsHandshake, ws_event_ok:wsEvent, rtt_ms:Date.now()-started, bytes, reason_code:reason, time_sync_ms:timeSyncMs };
}

const rows = [];
for (const t of targets){ rows.push({ target_id:`${t.provider}-${t.channel}`, ...t, ...await probe(t), url_hash:redactHash(t.endpoint).slice(0,16) }); }
const restOk = rows.some((r)=>r.channel==='REST' && r.http_ok && r.reason_code==='E_OK');
const wsOk = rows.some((r)=>r.channel==='WS' && r.ws_handshake_ok && r.ws_event_ok);
const proxy = process.env.PROXY_URL || '';
let scheme='NONE'; try { scheme = proxy ? new URL(proxy).protocol.replace(':','').toUpperCase() : 'NONE'; } catch { scheme='INVALID'; }

const diagDoc = [
  '# E127 EGRESS DIAG V6',
  `- mode: ${mode}`,
  `- force_ipv4_effective: ${forceIpv4}`,
  `- proxy_scheme: ${scheme}`,
  `- proxy_hash: ${proxy ? redactHash(proxy) : 'NONE'}`,
  `- time_sync_drift_range_ms: ${rows.map((r)=>r.time_sync_ms).filter((v)=>v!=='NA').join(',') || 'NA'}`,
  '| target_id | provider | channel | endpoint | url_hash | dns_ok | tcp_ok | tls_ok | http_ok | ws_handshake_ok | ws_event_ok | rtt_ms | bytes | reason_code |',
  '|---|---|---|---|---|---|---|---|---|---|---|---:|---:|---|',
  ...rows.map((r)=>`| ${r.target_id} | ${r.provider} | ${r.channel} | ${r.endpoint} | ${r.url_hash} | ${r.dns_ok} | ${r.tcp_ok} | ${r.tls_ok} | ${r.http_ok} | ${r.ws_handshake_ok} | ${r.ws_event_ok} | ${r.rtt_ms} | ${r.bytes} | ${r.reason_code} |`),
  `- rest_success: ${restOk}`,
  `- ws_success: ${wsOk}`
].join('\n');

if (process.env.E127_DIAG_WRITE==='1' || process.env.UPDATE_E127_EVIDENCE==='1') {
  writeMdAtomic('reports/evidence/E127/EGRESS_DIAG_V6.md', diagDoc);
} else {
  process.stdout.write(`${diagDoc}\n`);
}

if (mode==='ONLINE_REQUIRED' && (!restOk || !wsOk)) process.exit(1);
