import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File, sha256Text } from './e66_lib.mjs';

export const E132_ROOT = path.resolve('reports/evidence/E132');
export const E132_REQUIRED = [
  'PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','EGRESS_DIAG_V10.md','CONNECT_PROOF.md','TIME_SYNC_V4.md',
  'QUORUM_POLICY_V6.md','QUORUM_SCORE_V7.md','ANTI_FAKE_FULL_V9.md','ARMING_PROOF_V3.md','EXECUTION_FLOW_V4.md','LIVE_FILL_PROOF_V2.md','LIVE_FILL_GATE.md',
  'ZERO_WRITES_ON_FAIL.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md','SEAL_X2.md','REPLAY_X2.md','CODEX_REPORT.md'
];

export const E132_TARGETS = [
  { provider: 'BINANCE', channel: 'REST', endpoint: 'https://api.binance.com/api/v3/time', port:443 },
  { provider: 'BINANCE', channel: 'WS', endpoint: 'wss://stream.binance.com:9443/ws/btcusdt@trade', port:9443 },
  { provider: 'BYBIT', channel: 'REST', endpoint: 'https://api-testnet.bybit.com/v5/market/time', port:443 },
  { provider: 'BYBIT', channel: 'WS', endpoint: 'wss://stream-testnet.bybit.com/v5/public/linear', port:443 },
  { provider: 'KRAKEN', channel: 'REST', endpoint: 'https://api.kraken.com/0/public/Time', port:443 },
  { provider: 'KRAKEN', channel: 'WS', endpoint: 'wss://ws.kraken.com', port:443 },
  { provider: 'NEUTRAL', channel: 'NEUTRAL', endpoint: 'https://example.com/', port:443 }
];

export function modeE132() {
  const m = ['OFFLINE_ONLY', 'ONLINE_OPTIONAL', 'ONLINE_REQUIRED'].filter((k) => process.env[k] === '1');
  if (m.length > 1) throw new Error(`E132_MODE_CONFLICT:${m.join(',')}`);
  return m[0] || 'OFFLINE_ONLY';
}
export function isCITruthy() { const ci = String(process.env.CI || ''); return ci === 'true' || ci === '1'; }
export function runDirE132() { return path.resolve(process.env.TREASURE_RUN_DIR || '.run/treasure/E132_1700000000'); }

export function atomicWrite(p, b) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const t = `${p}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(t, b, 'utf8');
  fs.renameSync(t, p);
}
export function writeMdAtomic(p, t) { atomicWrite(p, `${String(t).replace(/\r\n/g, '\n').replace(/\s+$/gm, '').trimEnd()}\n`); }
export function cmdOut(c, a) { return spawnSync(c, a, { encoding: 'utf8' }).stdout.trim(); }
export function redactHash(v) { return v ? sha256Text(String(v)) : 'NONE'; }
export function hostHash(v) { return sha256Text(String(v || '')).slice(0, 16); }
export function proxyShape(env = process.env) {
  const raw = env.HTTPS_PROXY || env.HTTP_PROXY || env.ALL_PROXY || '';
  try {
    const u = new URL(raw);
    return { present: true, scheme: u.protocol.replace(':', ''), hash: sha256Text(`${u.protocol}//${u.hostname}:${u.port || (u.protocol === 'https:' ? '443' : '80')}`) };
  } catch {
    return { present: false, scheme: 'unknown', hash: raw ? sha256Text(raw) : 'NONE' };
  }
}
export function caPresent(env = process.env) {
  if (env.SSL_CERT_FILE || env.SSL_CERT_DIR || env.NODE_EXTRA_CA_CERTS || env.REQUESTS_CA_BUNDLE || env.CURL_CA_BUNDLE) return true;
  return fs.existsSync('/etc/ssl/certs');
}

export function enforceCIBoundaryE132() {
  if (!isCITruthy()) return;
  for (const [k, vRaw] of Object.entries(process.env)) {
    const v = String(vRaw || '').trim(); if (!v) continue;
    if (k.startsWith('UPDATE_') || k === 'ENABLE_NET' || k.startsWith('ONLINE_') || k.startsWith('WS_') || k === 'I_UNDERSTAND_LIVE_RISK' || k === 'ARM_LIVE' || k === 'LIVE' || k === 'FORCE_NET_DOWN') throw new Error(`E132_CI_FORBIDDEN_ENV:${k}`);
  }
}
export function snapshotState(paths) {
  return sha256Text(paths.map((p) => {
    const a = path.resolve(p);
    if (!fs.existsSync(a)) return `${p}:ABSENT`;
    const st = fs.statSync(a);
    if (st.isFile()) return `${p}:FILE:${sha256File(a)}`;
    return `${p}:DIR:${sha256Text(fs.readdirSync(a).sort().join('|'))}`;
  }).join('\n'));
}
export function evidenceFingerprintE132() {
  const ignore = new Set(['CLOSEOUT.md', 'VERDICT.md', 'SHA256SUMS.md', 'SEAL_X2.md', 'REPLAY_X2.md']);
  return sha256Text(E132_REQUIRED.filter((f) => !ignore.has(f)).map((f) => {
    const full = path.join(E132_ROOT, f);
    return `${f}:${fs.existsSync(full) ? sha256File(full) : 'ABSENT'}`;
  }).join('\n'));
}
