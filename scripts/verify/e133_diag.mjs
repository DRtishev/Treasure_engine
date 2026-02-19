#!/usr/bin/env node
import { dialTarget } from '../../core/net/e129_transport_dialer.mjs';
import { resolveTransportConfig } from '../../core/transport/e130_transport_config.mjs';
import { E133_TARGETS, modeE133, writeMdAtomic, E133_ROOT } from './e133_lib.mjs';

const mode = modeE133();
const enabled = process.env.ENABLE_NET === '1' && process.env.I_UNDERSTAND_LIVE_RISK === '1';
const forceNetDown = process.env.FORCE_NET_DOWN === '1';
const cfg = resolveTransportConfig(process.env);
const rows = [];
for (const t of E133_TARGETS) {
  const r = await dialTarget({ target: t, mode, enabled, forceNetDown, forceIpv4: cfg.force_ipv4, preferIpv6: false });
  rows.push({ ...t, ...r });
}
const matrix = [
  '# E133 TRANSPORT STAGE MATRIX',
  `- proxy_scheme: ${cfg.proxy_scheme}`,
  `- proxy_shape_hash: ${cfg.proxy_shape_hash}`,
  `- ca_present: ${cfg.ca_present}`,
  `- dispatcher_mode: ${cfg.proxy_present ? 'env_proxy' : 'direct'}`,
  '| provider | channel | dns_ok | tcp_ok | tls_ok | http_ok | ws_handshake_ok | ws_event_ok | tcp_to_proxy_ok | connect_tunnel_ok | tls_over_tunnel_ok | http_over_tunnel_ok | ws_over_tunnel_ok | reason_code |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.provider} | ${r.channel} | ${r.dns_ok} | ${r.tcp_ok} | ${r.tls_ok} | ${r.http_ok} | ${r.ws_handshake_ok} | ${r.ws_event_ok} | ${r.tcp_to_proxy_ok} | ${r.connect_tunnel_ok} | ${r.tls_over_tunnel_ok} | ${r.http_over_tunnel_ok} | ${r.ws_over_tunnel_ok} | ${r.reason_code} |`)
].join('\n');
if (process.env.E133_DIAG_CANONICAL_WRITE === '1') writeMdAtomic(`${E133_ROOT}/TRANSPORT_STAGE_MATRIX.md`, matrix);
else process.stdout.write(`${matrix}\n`);
if (mode === 'ONLINE_REQUIRED' && !rows.some((r) => r.channel === 'REST' && r.reason_code === 'E_OK')) process.exit(1);
