#!/usr/bin/env node
import { dialTarget } from '../../core/net/e129_transport_dialer.mjs';
import { resolveTransportConfig } from '../../core/transport/e130_transport_config.mjs';
import { E131_ROOT, E131_TARGETS, E131_TIME_ENDPOINTS, modeE131, writeMdAtomic, redactHash, redactShape } from './e131_lib.mjs';

const mode = modeE131();
const enabled = process.env.ENABLE_NET === '1' && process.env.I_UNDERSTAND_LIVE_RISK === '1';
const forceNetDown = process.env.FORCE_NET_DOWN === '1';
const cfg = resolveTransportConfig(process.env);
const rows = [];

for (const t of [...E131_TARGETS].sort((a, b) => a.provider.localeCompare(b.provider) || a.channel.localeCompare(b.channel) || a.endpoint.localeCompare(b.endpoint))) {
  const r = await dialTarget({ target: t, mode, enabled, forceNetDown, forceIpv4: cfg.force_ipv4, preferIpv6: false });
  rows.push({ target_id: `${t.provider}-${t.channel}`, ...t, url_hash: redactHash(t.endpoint).slice(0, 16), ...r });
}

const timeRows = [];
for (const endpoint of E131_TIME_ENDPOINTS) {
  const t = await dialTarget({ target: { provider: 'TIME', channel: 'REST', endpoint }, mode, enabled, forceNetDown, forceIpv4: cfg.force_ipv4, preferIpv6: false });
  timeRows.push({ endpoint, drift: t.clock_drift_sec, reason: t.reason_code });
}

const restOk = rows.some((r) => r.channel === 'REST' && r.provider !== 'PUBLIC' && r.http_ok && r.rest_payload_ok && r.reason_code === 'E_OK');
const wsHandshakeOk = rows.some((r) => r.channel === 'WS' && r.ws_handshake_ok);
const wsEventOk = rows.some((r) => r.channel === 'WS' && r.ws_event_ok && r.reason_code === 'E_OK');
const probe = rows.find((r) => r.provider === 'PUBLIC' && r.channel === 'REST');

const remMap = {
  E_DNS_FAIL: 'Switch resolver or disable split-tunnel DNS.',
  E_TCP_FAIL: 'Check outbound ACL/firewall/proxy and retry with FORCE_IPV4=1.',
  E_TLS_FAIL: 'Install proper CA trust chain and verify NODE_EXTRA_CA_CERTS.',
  E_HTTP_FAIL: 'Provider responded non-success. Validate endpoint and upstream health.',
  E_WS_HANDSHAKE_FAIL: 'Proxy/firewall may block websocket upgrade; allow GET + Upgrade.',
  E_WS_HANDSHAKE_OK_BUT_NO_EVENT: 'Handshake passed but no frame arrived in timeout window.',
  E_NET_BLOCKED: 'Runtime egress disabled or policy blocked. Use Fuel-Pump external capture path.',
  E_TIMEOUT: 'Timeout path hit. Increase timeout only after transport-level root cause review.'
};
const reasons = [...new Set(rows.map((r) => r.reason_code))].sort();
const remediation = ['# E131 OPERATOR REMEDIATION V3', ...reasons.map((r) => `- ${r}: ${remMap[r] || 'Inspect EGRESS_DIAG_V9 and rerun with FORCE_IPV4=1 / proxy fixes.'}`)].join('\n');

const matrix = [
  '# E131 TRANSPORT MATRIX V3',
  `- proxy_scheme: ${cfg.proxy_scheme}`,
  `- proxy_shape_hash: ${cfg.proxy_shape_hash}`,
  `- ca_present: ${cfg.ca_present}`,
  `- ip_family: ${cfg.ip_family}`,
  `- dispatcher_mode: ${cfg.proxy_present ? 'env_proxy' : 'direct'}`,
  '| target_id | provider | channel | url_hash | dns_ok | tcp_ok | tls_ok | http_ok | ws_handshake_ok | ws_event_ok | tcp_to_proxy_ok | connect_tunnel_ok | tls_over_tunnel_ok | http_over_tunnel_ok | ws_over_tunnel_ok | rtt_ms | bytes | reason_code | proxy_shape_hash | ip_family |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---:|---:|---|---|---|',
  ...rows.map((r) => `| ${r.target_id} | ${r.provider} | ${r.channel} | ${r.url_hash} | ${r.dns_ok} | ${r.tcp_ok} | ${r.tls_ok} | ${r.http_ok} | ${r.ws_handshake_ok} | ${r.ws_event_ok} | ${r.tcp_to_proxy_ok} | ${r.connect_tunnel_ok} | ${r.tls_over_tunnel_ok} | ${r.http_over_tunnel_ok} | ${r.ws_over_tunnel_ok} | ${r.rtt_ms} | ${r.bytes} | ${r.reason_code} | ${cfg.proxy_shape_hash} | ${cfg.ip_family} |`),
  `- rest_success: ${restOk}`,
  `- ws_handshake_success: ${wsHandshakeOk}`,
  `- ws_success: ${wsEventOk}`,
  `- public_probe_example_com: ${probe ? probe.reason_code : 'E_NO_PROBE'}`
].join('\n');

const drifts = timeRows.map((x) => Number(x.drift)).filter(Number.isFinite);
const timeSync = [
  '# E131 TIME SYNC V4',
  `- source_count: ${timeRows.length}`,
  `- source_success_count: ${drifts.length}`,
  `- drift_min_sec: ${drifts.length ? Math.min(...drifts) : 'NA'}`,
  `- drift_max_sec: ${drifts.length ? Math.max(...drifts) : 'NA'}`,
  `- reason_code: ${drifts.length >= 2 ? 'E_OK' : 'E_TIME_QUORUM_FAIL'}`,
  ...timeRows.map((x) => `- endpoint: ${x.endpoint} drift_sec=${x.drift} reason=${x.reason}`)
].join('\n');

const diag = [
  '# E131 EGRESS DIAG V9',
  `- mode: ${mode}`,
  `- enabled: ${enabled}`,
  `- force_net_down: ${forceNetDown}`,
  `- rest_ok: ${restOk}`,
  `- ws_handshake_ok: ${wsHandshakeOk}`,
  `- ws_event_ok: ${wsEventOk}`,
  `- probe_example_com_reason: ${probe ? probe.reason_code : 'E_NO_PROBE'}`,
  '- stage_codes: E_DNS_FAIL, E_TCP_FAIL, E_TLS_FAIL, E_HTTP_FAIL, E_WS_HANDSHAKE_FAIL, E_WS_HANDSHAKE_OK_BUT_NO_EVENT, E_OK'
].join('\n');

if ((process.env.E131_DIAG_CANONICAL_WRITE === '1' || process.env.UPDATE_E131_EVIDENCE === '1') && mode !== 'ONLINE_REQUIRED') {
  writeMdAtomic(`${E131_ROOT}/EGRESS_DIAG_V9.md`, diag);
  writeMdAtomic(`${E131_ROOT}/TRANSPORT_MATRIX_V3.md`, matrix);
  writeMdAtomic(`${E131_ROOT}/TIME_SYNC_V4.md`, timeSync);
  writeMdAtomic(`${E131_ROOT}/OPERATOR_REMEDIATION_V3.md`, remediation);
} else {
  process.stdout.write(`${diag}\n\n${matrix}\n\n${timeSync}\n\n${remediation}\n`);
}

if (mode === 'ONLINE_REQUIRED' && (!restOk || !wsEventOk)) process.exit(1);
