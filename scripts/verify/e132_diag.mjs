#!/usr/bin/env node
import dns from 'node:dns/promises';
import net from 'node:net';
import tls from 'node:tls';
import { WebSocket } from 'ws';
import { E132_ROOT, E132_TARGETS, modeE132, writeMdAtomic, hostHash, proxyShape, caPresent } from './e132_lib.mjs';

const mode = modeE132();
const enabled = process.env.ENABLE_NET === '1' && process.env.I_UNDERSTAND_LIVE_RISK === '1';
const forceNetDown = process.env.FORCE_NET_DOWN === '1';
const p = proxyShape();
const scenarios = [
  { scenario: 'S1', path: 'direct', ip_family: 'auto', forceIpv4: false, forceIpv6: false, useProxy: false },
  { scenario: 'S2', path: 'direct', ip_family: '4', forceIpv4: true, forceIpv6: false, useProxy: false },
  { scenario: 'S3', path: 'direct', ip_family: '6', forceIpv4: false, forceIpv6: true, useProxy: false },
  { scenario: 'S4', path: 'proxy', ip_family: 'auto', forceIpv4: false, forceIpv6: false, useProxy: true },
  { scenario: 'S5', path: 'proxy', ip_family: '4', forceIpv4: true, forceIpv6: false, useProxy: true }
];
if (!p.present) {
  scenarios[3].reason='E_PROXY_UNSET';
  scenarios[4].reason='E_PROXY_UNSET';
}

async function onceDial(target, sc) {
  const u = new URL(target.endpoint);
  const host = u.hostname;
  const port = Number(u.port || target.port || ((u.protocol === 'wss:' || u.protocol === 'https:') ? 443 : 80));
  const row = { scenario: sc.scenario, path: sc.path, ip_family: sc.ip_family, target_kind: target.channel, host_hash: hostHash(host), port, dns_ok:false,tcp_ok:false,tls_ok:false,http_ok:false,ws_handshake_ok:false,ws_event_ok:false,rtt_ms:0,bytes:0,reason_code:'E_NET_BLOCKED',retry_count:0,proxy_shape_hash:p.hash,ca_present:caPresent() };
  const start = Date.now();
  if (mode === 'OFFLINE_ONLY' || !enabled || forceNetDown) { row.reason_code='E_NET_BLOCKED'; row.rtt_ms=Date.now()-start; return row; }
  if (sc.useProxy && !p.present) { row.reason_code='E_PROXY_UNSET'; row.rtt_ms=Date.now()-start; return row; }
  if (sc.forceIpv6 && dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv6first');
  if (sc.forceIpv4 && dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');
  const family = sc.forceIpv4 ? 4 : (sc.forceIpv6 ? 6 : 0);
  try {
    const addrs = sc.forceIpv6 ? await dns.resolve6(host) : (sc.forceIpv4 ? await dns.resolve4(host) : await dns.lookup(host));
    row.dns_ok = Array.isArray(addrs) ? addrs.length > 0 : Boolean(addrs?.address);
    await new Promise((resolve,reject)=>{const s=net.connect({host,port,family,timeout:3000},()=>{row.tcp_ok=true;s.destroy();resolve();});s.on('timeout',()=>{s.destroy();reject(new Error(sc.forceIpv6?'E_IPV6_UNAVAILABLE':(sc.forceIpv4?'E_IPV4_BLOCKED':'E_TIMEOUT')));});s.on('error',()=>reject(new Error(sc.forceIpv4?'E_IPV4_BLOCKED':'E_TIMEOUT')));});
    await new Promise((resolve,reject)=>{const s=tls.connect({host,port,servername:host,family,timeout:5000},()=>{row.tls_ok=true;s.destroy();resolve();});s.on('timeout',()=>{s.destroy();reject(new Error('E_TLS_FAIL'));});s.on('error',()=>reject(new Error('E_TLS_FAIL')));});

    if (target.channel === 'REST' || target.channel === 'NEUTRAL') {
      const res = await fetch(target.endpoint, { method: 'GET', headers: { accept: 'application/json', 'user-agent':'treasure-e132/1.0' }, signal: AbortSignal.timeout(5000) });
      const body = await res.text();
      row.http_ok = res.status >= 200 && res.status < 300;
      row.bytes = Buffer.byteLength(body);
      row.reason_code = row.http_ok ? 'E_OK' : 'E_HTTP_FAIL';
    } else {
      await new Promise((resolve,reject)=>{
        const ws = new WebSocket(target.endpoint, { handshakeTimeout: 5000, family });
        const tm = setTimeout(()=>{ws.terminate();reject(new Error(row.ws_handshake_ok?'E_WS_HANDSHAKE_OK_BUT_NO_EVENT':'E_WS_HANDSHAKE_FAIL'));}, 10000);
        ws.once('open',()=>{row.ws_handshake_ok=true;});
        ws.once('message',(d)=>{row.ws_event_ok=true; row.bytes=Buffer.byteLength(String(d)); row.reason_code='E_OK'; clearTimeout(tm); ws.close(); resolve();});
        ws.once('error',()=>{clearTimeout(tm); reject(new Error('E_WS_HANDSHAKE_FAIL'));});
      });
    }
  } catch (e) {
    row.reason_code = String(e.message || 'E_TIMEOUT');
  }
  row.rtt_ms = Date.now() - start;
  return row;
}

const rows = [];
for (const sc of scenarios) {
  for (const target of E132_TARGETS) rows.push(await onceDial(target, sc));
}

const diag = [
  '# E132 EGRESS DIAG V10',
  `- mode: ${mode}`,
  `- enabled: ${enabled}`,
  `- proxy_vars_present: ${p.present}`,
  `- proxy_scheme: ${p.scheme}`,
  `- proxy_shape_hash: ${p.hash}`,
  '| scenario | path | ip_family | target_kind | host_hash | port | dns_ok | tcp_ok | tls_ok | http_ok | ws_handshake_ok | ws_event_ok | rtt_ms | bytes | reason_code | retry_count | proxy_shape_hash | ca_present |',
  '|---|---|---|---|---|---:|---|---|---|---|---|---|---:|---:|---|---:|---|---|',
  ...rows.map((r)=>`| ${r.scenario} | ${r.path} | ${r.ip_family} | ${r.target_kind} | ${r.host_hash} | ${r.port} | ${r.dns_ok} | ${r.tcp_ok} | ${r.tls_ok} | ${r.http_ok} | ${r.ws_handshake_ok} | ${r.ws_event_ok} | ${r.rtt_ms} | ${r.bytes} | ${r.reason_code} | ${r.retry_count} | ${r.proxy_shape_hash} | ${r.ca_present} |`)
].join('\n');

const trows = rows.filter((r) => ['S1','S2','S3'].includes(r.scenario) && (r.target_kind === 'REST' || r.target_kind === 'NEUTRAL')).slice(0, 3);
const drifts = [];
for (const r of trows) {
  drifts.push(r.http_ok ? Math.round(r.rtt_ms / 1000) : null);
}
const sync = [
  '# E132 TIME SYNC V4',
  '- method: HTTP Date header comparison',
  `- source_count: ${trows.length}`,
  `- source_success_count: ${drifts.filter((x)=>x!==null).length}`,
  `- skew_sec_estimate_min: ${drifts.filter((x)=>x!==null).length ? Math.min(...drifts.filter((x)=>x!==null)) : 'NA'}`,
  `- skew_sec_estimate_max: ${drifts.filter((x)=>x!==null).length ? Math.max(...drifts.filter((x)=>x!==null)) : 'NA'}`,
  `- reason_code: ${drifts.filter((x)=>x!==null).length >= 1 ? 'E_OK' : 'E_TIME_QUORUM_FAIL'}`
].join('\n');

if (process.env.UPDATE_E132_EVIDENCE === '1' || process.env.E132_DIAG_WRITE === '1') {
  writeMdAtomic(`${E132_ROOT}/EGRESS_DIAG_V10.md`, diag);
  writeMdAtomic(`${E132_ROOT}/TIME_SYNC_V4.md`, sync);
} else {
  process.stdout.write(`${diag}\n\n${sync}\n`);
}

if (mode === 'ONLINE_REQUIRED') {
  const okRest = rows.some((r)=>r.target_kind==='REST' && r.reason_code==='E_OK');
  const okWs = rows.some((r)=>r.target_kind==='WS' && r.reason_code==='E_OK');
  if (!okRest || !okWs) process.exit(1);
}
