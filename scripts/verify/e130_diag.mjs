#!/usr/bin/env node
import { dialTarget } from '../../core/net/e129_transport_dialer.mjs';
import { resolveTransportConfig } from '../../core/transport/e130_transport_config.mjs';
import { E130_ROOT, E130_TARGETS, modeE130, writeMdAtomic, redactHash } from './e130_lib.mjs';

const mode=modeE130();
const enabled=process.env.ENABLE_NET==='1'&&process.env.I_UNDERSTAND_LIVE_RISK==='1';
const forceNetDown=process.env.FORCE_NET_DOWN==='1';
const cfg=resolveTransportConfig(process.env);
const rows=[];
for(const t of [...E130_TARGETS].sort((a,b)=>a.provider.localeCompare(b.provider)||a.channel.localeCompare(b.channel)||a.endpoint.localeCompare(b.endpoint))){
  const r=await dialTarget({target:t,mode,enabled,forceNetDown,forceIpv4:cfg.force_ipv4,preferIpv6:false});
  let reason=r.reason_code;
  if(r.err_code==='ENETUNREACH' || r.reason_code==='E_TIMEOUT') reason='E_TCP_FAIL';
  if(!cfg.ca_present && r.reason_code==='E_TLS_FAIL') reason='E_TLS_CA';
  rows.push({target_id:`${t.provider}-${t.channel}`,...t,url_hash:redactHash(t.endpoint).slice(0,16),...r,reason_code:reason});
}
const restOk=rows.some((r)=>r.channel==='REST'&&r.http_ok&&r.rest_payload_ok&&r.reason_code==='E_OK');
const wsOk=rows.some((r)=>r.channel==='WS'&&r.ws_event_ok&&r.reason_code==='E_OK');
const drift=rows.map((r)=>r.clock_drift_sec).filter((v)=>v!=='NA').map(Number);
const time=['# E130 TIME SYNC V3',`- source_count: ${drift.length}`,`- drift_min_sec: ${drift.length?Math.min(...drift):'NA'}`,`- drift_max_sec: ${drift.length?Math.max(...drift):'NA'}`,`- reason_code: ${drift.length?'E_OK':'E_NO_DATE_HEADER'}`].join('\n');
const remMap={E_DNS_FAIL:'switch resolver or disable split-VPN DNS',E_TCP_FAIL:'check outbound ACL/firewall/proxy, retry FORCE_IPV4=1',E_TLS_CA:'configure NODE_EXTRA_CA_CERTS / trust chain',E_WS_HANDSHAKE_FAIL:'proxy may block websocket upgrade over 443',E_WS_HANDSHAKE_OK_BUT_NO_EVENT:'switch endpoint/provider and extend timeout',E_HTTP_4XX:'check endpoint path/params/auth',E_HTTP_5XX:'provider unstable; rotate endpoint',E_PROXY_REQUIRED:'export HTTPS_PROXY/HTTP_PROXY and retry',E_PROXY_AUTH:'supply proxy auth in runtime env only',E_BAD_SCHEMA:'inspect payload parser assumptions',E_EMPTY:'provider returned empty payload'};
const reasons=[...new Set(rows.map((r)=>r.reason_code))].sort();
const remediation=['# E130 OPERATOR REMEDIATION V2',...reasons.map((r)=>`- ${r}: ${remMap[r]||'inspect transport matrix and rerun diag:deep'}`)].join('\n');
const matrix=['# E130 TRANSPORT MATRIX',`- proxy_scheme: ${cfg.proxy_scheme}`,`- proxy_shape_hash: ${cfg.proxy_shape_hash}`,`- ca_present: ${cfg.ca_present}`,`- ip_family: ${cfg.ip_family}`,`- proxy_profile: ${cfg.proxy_profile}`,'| target_id | provider | channel | endpoint | url_hash | dns_ok | tcp_ok | tls_ok | http_ok | ws_handshake_ok | ws_event_ok | rtt_ms | bytes | reason_code | proxy_shape_hash | ip_family |','|---|---|---|---|---|---|---|---|---|---|---|---:|---:|---|---|---|',...rows.map((r)=>`| ${r.target_id} | ${r.provider} | ${r.channel} | ${r.endpoint} | ${r.url_hash} | ${r.dns_ok} | ${r.tcp_ok} | ${r.tls_ok} | ${r.http_ok} | ${r.ws_handshake_ok} | ${r.ws_event_ok} | ${r.rtt_ms} | ${r.bytes} | ${r.reason_code} | ${cfg.proxy_shape_hash} | ${cfg.ip_family} |`),`- rest_success: ${restOk}`,`- ws_success: ${wsOk}`].join('\n');
if(process.env.E130_DIAG_WRITE==='1'||process.env.UPDATE_E130_EVIDENCE==='1'){writeMdAtomic(`${E130_ROOT}/TRANSPORT_MATRIX.md`,matrix); writeMdAtomic(`${E130_ROOT}/TIME_SYNC_V3.md`,time); writeMdAtomic(`${E130_ROOT}/OPERATOR_REMEDIATION_V2.md`,remediation);} else {process.stdout.write(`${matrix}\n\n${time}\n\n${remediation}\n`);} 
if(mode==='ONLINE_REQUIRED'&&(!restOk||!wsOk)) process.exit(1);
