#!/usr/bin/env node
/**
 * E136 Online Diag — GATED. Requires ENABLE_NET=1 and I_UNDERSTAND_LIVE_RISK=1.
 * Never invoked by verify:e136 in CI. Call via: verify:e136:online
 *
 * Produces: reports/evidence/E136/ONLINE_DIAG.md (overwrites SKIPPED notice)
 * Uses ALLOWLISTED targets only. Redacts all external hosts/URLs.
 */
import net from 'node:net';
import tls from 'node:tls';
import https from 'node:https';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { E136_ROOT, writeMdAtomic } from './e136_lib.mjs';
import { rewriteSums } from './foundation_sums.mjs';

const ENABLE_NET = process.env.ENABLE_NET === '1';
const LIVE_RISK = process.env.I_UNDERSTAND_LIVE_RISK === '1';
const ONLINE_OPTIONAL = process.env.ONLINE_OPTIONAL === '1';
const ONLINE_REQUIRED = process.env.ONLINE_REQUIRED === '1';
const FORCE_IPV4 = process.env.FORCE_IPV4 === '1';
const FORCE_IPV6 = process.env.FORCE_IPV6 === '1';

if (!ENABLE_NET || !LIVE_RISK) {
  process.stderr.write(
    'E136_ONLINE_DIAG: SKIPPED — ENABLE_NET=1 and I_UNDERSTAND_LIVE_RISK=1 required\n',
  );
  process.exit(0);
}

const family = FORCE_IPV4 ? 4 : FORCE_IPV6 ? 6 : 0;

function hashEndpoint(host, port) {
  return createHash('sha256').update(`${host}:${port}`).digest('hex').slice(0, 16);
}

const ALLOWLIST = [
  { label: 'dns-check-1', host: '1.1.1.1', port: 443, scheme: 'https', desc: 'TLS+HTTP probe' },
  { label: 'dns-check-2', host: '8.8.8.8', port: 443, scheme: 'https', desc: 'TLS probe alternate' },
];

function emptyResult() {
  return {
    tcp_ok: false, tls_ok: false, http_ok: false,
    ws_handshake_ok: false, ws_event_ok: false,
    reason_code: 'E_TCP_FAIL', rtt_ms: 0,
  };
}

async function probeTCP(host, port, timeoutMs = 4000) {
  return new Promise((res, rej) => {
    const s = net.connect({ host, port, timeout: timeoutMs, family }, () => { s.destroy(); res(); });
    s.on('timeout', () => { s.destroy(); rej(new Error('E_TCP_FAIL')); });
    s.on('error', () => rej(new Error('E_TCP_FAIL')));
  });
}

async function probeTLS(host, port, timeoutMs = 5000) {
  return new Promise((res, rej) => {
    const s = tls.connect({ host, port, timeout: timeoutMs, family, servername: host, rejectUnauthorized: true }, () => { s.destroy(); res(); });
    s.on('timeout', () => { s.destroy(); rej(new Error('E_TLS_FAIL')); });
    s.on('error', () => rej(new Error('E_TLS_FAIL')));
  });
}

async function probeHTTP(host, port, timeoutMs = 6000) {
  return new Promise((res, rej) => {
    const req = https.request(
      { hostname: host, port, path: '/', method: 'HEAD', timeout: timeoutMs, family, rejectUnauthorized: true },
      (r) => { r.resume(); res(r.statusCode || 0); },
    );
    req.on('timeout', () => { req.destroy(); rej(new Error('E_HTTP_FAIL')); });
    req.on('error', () => rej(new Error('E_HTTP_FAIL')));
    req.end();
  });
}

const rows = [];
for (const target of ALLOWLIST) {
  const r = emptyResult();
  const t0 = Date.now();
  const shapeHash = hashEndpoint(target.host, target.port);
  try {
    await probeTCP(target.host, target.port);
    r.tcp_ok = true;
    await probeTLS(target.host, target.port);
    r.tls_ok = true;
    const status = await probeHTTP(target.host, target.port);
    r.http_ok = status > 0;
    r.reason_code = r.http_ok ? 'OK' : 'E_HTTP_FAIL';
  } catch (e) {
    const m = String(e.message || '');
    if (m.includes('E_TLS_FAIL')) r.reason_code = 'E_TLS_FAIL';
    else if (m.includes('E_HTTP_FAIL')) r.reason_code = 'E_HTTP_FAIL';
    else r.reason_code = 'E_TCP_FAIL';
  }
  r.rtt_ms = Date.now() - t0;
  rows.push({ label: target.label, scheme: target.scheme, shape_hash: shapeHash, ...r });
}

const header = '| label | scheme | shape_hash | tcp_ok | tls_ok | http_ok | rtt_ms | reason_code |';
const sep = '|---|---|---|---|---|---|---:|---|';
const rowLines = rows.map((r) =>
  `| ${r.label} | ${r.scheme} | ${r.shape_hash} | ${r.tcp_ok} | ${r.tls_ok} | ${r.http_ok} | ${r.rtt_ms} | ${r.reason_code} |`,
);

const mode = ONLINE_REQUIRED ? 'ONLINE_REQUIRED' : ONLINE_OPTIONAL ? 'ONLINE_OPTIONAL' : 'ONLINE_UNGATED';
const allOk = rows.every((r) => r.reason_code === 'OK');
const status = allOk ? 'PASS' : ONLINE_REQUIRED ? 'FAIL' : 'WARN';

const diagLines = [
  '# E136 ONLINE DIAG',
  `- mode: ${mode}`,
  `- enabled: true`,
  `- force_ipv4: ${FORCE_IPV4}`,
  `- force_ipv6: ${FORCE_IPV6}`,
  `- ip_family: ${FORCE_IPV4 ? 'ipv4' : FORCE_IPV6 ? 'ipv6' : 'auto'}`,
  `- targets_probed: ${rows.length}`,
  `- status: ${status}`,
  `- reason_codes: ${[...new Set(rows.map((r) => r.reason_code))].sort().join(',')}`,
  '',
  '## Stage Matrix',
  header, sep, ...rowLines,
  '',
  '## Redaction Policy',
  '- external_hostnames: NOT LOGGED (shape_hash = sha256(host:port)[0:16] only)',
  '- proxy_credentials: NOT LOGGED',
  '- raw_urls: NOT LOGGED',
  `- ip_family_used: ${FORCE_IPV4 ? 'ipv4' : FORCE_IPV6 ? 'ipv6' : 'auto'}`,
];

writeMdAtomic(path.join(E136_ROOT, 'ONLINE_DIAG.md'), diagLines.join('\n'));
rewriteSums(E136_ROOT, ['SHA256SUMS.md'], 'reports/evidence');

process.stdout.write(`E136 ONLINE DIAG: ${status}\n`);
if (ONLINE_REQUIRED && !allOk) {
  process.stderr.write(`E136_ONLINE_REQUIRED_FAIL: not all targets OK\n`);
  process.exit(1);
}
process.exit(0);
