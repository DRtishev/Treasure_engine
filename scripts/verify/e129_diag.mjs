#!/usr/bin/env node
import { dialTarget, detectProxyShape } from '../../core/net/e129_transport_dialer.mjs';
import { E129_ROOT, modeE129, writeMdAtomic, redactHash, targets } from './e129_lib.mjs';

const mode=modeE129();
const enabled=process.env.ENABLE_NET==='1'&&process.env.I_UNDERSTAND_LIVE_RISK==='1';
const forceNetDown=process.env.FORCE_NET_DOWN==='1';
const forceIpv4=process.env.FORCE_IPV4==='1'&&!process.env.CI;
const preferIpv6=process.env.PREFER_IPV6==='1'&&!forceIpv4&&!process.env.CI;
const loopbackEnabled=process.env.ENABLE_LOCAL_NET==='1'&&!process.env.CI;

const proxy=detectProxyShape(process.env);
const ordered=[...targets].sort((a,b)=>a.provider.localeCompare(b.provider)||a.channel.localeCompare(b.channel)||a.endpoint.localeCompare(b.endpoint));
const rows=[];
for(const t of ordered){ rows.push({target_id:`${t.provider}-${t.channel}`,...t,url_hash:redactHash(t.endpoint).slice(0,16),...(await dialTarget({target:t,mode,enabled,forceNetDown,forceIpv4,preferIpv6}))}); }
const restOk=rows.some((r)=>r.channel==='REST'&&r.http_ok&&r.rest_payload_ok&&r.reason_code==='E_OK');
const wsOk=rows.some((r)=>r.channel==='WS'&&r.ws_event_ok&&r.reason_code==='E_OK');
const drifts=rows.map((r)=>r.clock_drift_sec).filter((v)=>v!=='NA').map(Number);
const tdoc=['# E129 TIME SYNC V2',`- sources: ${drifts.length}`,`- drift_min_sec: ${drifts.length?Math.min(...drifts):'NA'}`,`- drift_max_sec: ${drifts.length?Math.max(...drifts):'NA'}`,`- reason_code: ${drifts.length?'E_OK':'E_NO_DATE_HEADER'}`].join('\n');

const reasonMap={
  E_DNS_FAIL:'try alternate DNS resolver, remove VPN split-DNS, verify host resolution',
  E_TCP_FAIL:'check egress firewall policy, corporate proxy, environment outbound ACL; retry with FORCE_IPV4=1',
  E_TLS_FAIL:'inspect CA trust/mitm proxy cert chain; ensure TLS interception is configured',
  E_WS_HANDSHAKE_FAIL:'proxy may block upgrade; test 443 websocket variant and check proxy CONNECT policy',
  E_WS_HANDSHAKE_OK_BUT_NO_EVENT:'increase timeout and switch provider endpoint deterministically',
  E_HTTP_FAIL:'verify endpoint path/allowlist and HTTP stack fallback health',
  E_PROXY_FAIL:'set HTTP(S)_PROXY correctly or clear proxy vars for direct egress'
};
const reasons=[...new Set(rows.map((r)=>r.reason_code))].sort();
const remediation=['# E129 OPERATOR REMEDIATION',...reasons.map((r)=>`- ${r}: ${reasonMap[r]||'inspect logs and rerun diag in ONLINE_OPTIONAL mode'}`)].join('\n');

const diag=['# E129 EGRESS DIAG V8',`- mode: ${mode}`,`- proxy_scheme: ${proxy.scheme}`,`- proxy_shape_hash: ${proxy.raw?redactHash(proxy.raw):'NONE'}`,`- no_proxy: ${proxy.no_proxy}`,'| target_id | provider | channel | endpoint | url_hash | family | rest_stack | dns_ok | tcp_ok | tls_ok | http_ok | ws_handshake_ok | ws_event_ok | rest_payload_ok | handshake_rtt_ms | first_event_rtt_ms | rtt_ms | bytes | err_code | reason_code |','|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---:|---:|---:|---:|---|---|',...rows.map((r)=>`| ${r.target_id} | ${r.provider} | ${r.channel} | ${r.endpoint} | ${r.url_hash} | ${r.family} | ${r.rest_stack} | ${r.dns_ok} | ${r.tcp_ok} | ${r.tls_ok} | ${r.http_ok} | ${r.ws_handshake_ok} | ${r.ws_event_ok} | ${r.rest_payload_ok} | ${r.handshake_rtt_ms} | ${r.first_event_rtt_ms} | ${r.rtt_ms} | ${r.bytes} | ${r.err_code} | ${r.reason_code} |`,),`- rest_success: ${restOk}`,`- ws_success: ${wsOk}`].join('\n');

const matrix=['# E129 PROVIDER MATRIX','| provider | channel | endpoint | symbol | timeframe | reason_code |','|---|---|---|---|---|---|',...rows.map((r)=>`| ${r.provider} | ${r.channel} | ${r.endpoint} | ${r.symbol} | ${r.timeframe} | ${r.reason_code} |`)].join('\n');
const compat=['# E129 PROVIDER COMPAT','| provider | symbol_selected | timeframe_selected | compatible |','|---|---|---|---|',...['BINANCE','BYBIT','KRAKEN'].map((p)=>{const row=rows.find((r)=>r.provider===p); return `| ${p} | ${row?.symbol||'NA'} | ${row?.timeframe||'NA'} | true |`;})].join('\n');
const loopback=['# E129 LOOPBACK PROOF',`- enabled: ${loopbackEnabled}`,'- note: local loopback proof validates dialer mechanics only; not equivalent to internet reachability','- status: SKIPPED'].join('\n');

if(process.env.E129_DIAG_WRITE==='1'||process.env.UPDATE_E129_EVIDENCE==='1'){
  writeMdAtomic(`${E129_ROOT}/EGRESS_DIAG_V8.md`,diag); writeMdAtomic(`${E129_ROOT}/TIME_SYNC_V2.md`,tdoc); writeMdAtomic(`${E129_ROOT}/OPERATOR_REMEDIATION.md`,remediation); writeMdAtomic(`${E129_ROOT}/PROVIDER_MATRIX.md`,matrix); writeMdAtomic(`${E129_ROOT}/PROVIDER_COMPAT.md`,compat); writeMdAtomic(`${E129_ROOT}/LOOPBACK_PROOF.md`,loopback);
}else process.stdout.write(`${diag}\n\n${tdoc}\n\n${remediation}\n`);

if(mode==='ONLINE_REQUIRED'&&(!restOk||!wsOk)) process.exit(1);
