#!/usr/bin/env node
import { dialTarget } from '../../core/net/e129_transport_dialer.mjs';
import { configureProxyDispatcher } from '../../core/transport/e134_proxy_dispatcher.mjs';
import { E134_TARGETS, E134_ROOT, modeE134, writeMdAtomic } from './e134_lib.mjs';

const mode = modeE134();
const enabled = process.env.ENABLE_NET === '1' && process.env.I_UNDERSTAND_LIVE_RISK === '1';
const forceNetDown = process.env.FORCE_NET_DOWN === '1';
const forceIpv4 = process.env.FORCE_IPV4 === '1';
const preferIpv6 = process.env.FORCE_IPV6 === '1';
const proxyMeta = configureProxyDispatcher(process.env);

const rows = [];
for (const t of E134_TARGETS) {
  const r = await dialTarget({ target: { provider: t.scenario.toUpperCase(), channel: t.channel, endpoint: t.target }, mode, enabled, forceNetDown, forceIpv4, preferIpv6 });
  rows.push({ scenario: t.scenario, target: t.target, ip_family: r.family, ...r });
}

const header = '| scenario | target | ip_family | dns_ok | tcp_ok | tls_ok | http_ok | ws_handshake_ok | ws_event_ok | tcp_to_proxy_ok | connect_tunnel_ok | tls_over_tunnel_ok | http_over_tunnel_ok | ws_over_tunnel_ok | rtt_ms | bytes | reason_code |';
const sep = '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---:|---:|---|';
const lines = rows.map((r) => `| ${r.scenario} | ${r.target} | ${r.ip_family} | ${r.dns_ok} | ${r.tcp_ok} | ${r.tls_ok} | ${r.http_ok} | ${r.ws_handshake_ok} | ${r.ws_event_ok} | ${r.tcp_to_proxy_ok} | ${r.connect_tunnel_ok} | ${r.tls_over_tunnel_ok} | ${r.http_over_tunnel_ok} | ${r.ws_over_tunnel_ok} | ${r.rtt_ms} | ${r.bytes} | ${r.reason_code} |`);

const matrix = ['# E134 TRANSPORT STAGE MATRIX', `- proxy_scheme: ${proxyMeta.proxy_scheme}`, `- proxy_shape_hash: ${proxyMeta.proxy_shape_hash}`, `- ca_present: ${proxyMeta.ca_present}`, `- dispatcher_mode: ${proxyMeta.dispatcher_mode}`, header, sep, ...lines].join('\n');
const diag = ['# E134 EGRESS DIAG V10', `- mode: ${mode}`, `- enabled: ${enabled}`, `- force_net_down: ${forceNetDown}`, `- ip_pref: ${forceIpv4 ? 'ipv4' : preferIpv6 ? 'ipv6' : 'auto'}`, `- reason_codes: ${[...new Set(rows.map((r) => r.reason_code))].sort().join(',')}`].join('\n');
const proxyBreak = ['# E134 PROXY BREAKOUT MATRIX', '- direct_stages: dns_ok,tcp_ok,tls_ok,http_ok,ws_handshake_ok,ws_event_ok', '- proxy_stages: tcp_to_proxy_ok,connect_tunnel_ok,tls_over_tunnel_ok,http_over_tunnel_ok,ws_over_tunnel_ok', '- strict_reason_codes: E_DNS_FAIL,E_TCP_FAIL,E_TLS_FAIL,E_HTTP_FAIL,E_WS_HANDSHAKE_FAIL,E_WS_EVENT_TIMEOUT,E_PROXY_CONNECT_FAIL,E_PROXY_TUNNEL_FAIL,E_PROXY_AUTH_REQUIRED,E_NET_BLOCKED,E_TIMEOUT,E_OK'].join('\n');

if (process.env.E134_DIAG_CANONICAL_WRITE === '1') {
  writeMdAtomic(`${E134_ROOT}/EGRESS_DIAG_V10.md`, diag);
  writeMdAtomic(`${E134_ROOT}/TRANSPORT_STAGE_MATRIX.md`, matrix);
  writeMdAtomic(`${E134_ROOT}/PROXY_BREAKOUT_MATRIX.md`, proxyBreak);
} else {
  process.stdout.write(`${diag}\n\n${matrix}\n\n${proxyBreak}\n`);
}
if (mode === 'ONLINE_REQUIRED' && !rows.some((r) => r.http_ok && r.ws_event_ok)) process.exit(1);
