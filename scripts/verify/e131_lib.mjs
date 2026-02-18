import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File, sha256Text } from './e66_lib.mjs';

export const E131_ROOT = path.resolve('reports/evidence/E131');
export const E131_REQUIRED = [
  'PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md',
  'EGRESS_DIAG_V9.md','TRANSPORT_MATRIX_V3.md','TIME_SYNC_V4.md','OPERATOR_REMEDIATION_V3.md','INTERNET_POLICY_NOTE.md','DIAG_COMPLETENESS_CONTRACT.md',
  'FUEL_PUMP_RUNBOOK.md','CAPSULE_IMPORT.md','REALITY_FUEL.md','DATA_LINEAGE.md','REPLAY_BUNDLE.md',
  'QUORUM_WINDOWS.md','LIVE_CONFIRM_MATRIX.md','QUORUM_SCORE.md','ANTI_FAKE_FULL.md','PARITY_COURT_V5.md','PARITY_LIVE_INPUT_CONTRACT.md',
  'CAMPAIGN_PLAN.md','ATTEMPTS_INDEX.md','EXECUTION_FLOW_V4.md','LIVE_FILL_PROOF.md','LIVE_FILL_GATE.md','LEDGER_CAMPAIGN_REPORT.md','LIVE_SAFETY_V3.md',
  'ZERO_WRITES_ON_FAIL.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md','SEAL_X2.md','REPLAY_X2.md','CODEX_REPORT.md'
];

export const E131_TARGETS = [
  { provider: 'BINANCE', channel: 'REST', endpoint: 'https://api.binance.com/api/v3/time' },
  { provider: 'BINANCE', channel: 'WS', endpoint: 'wss://stream.binance.com:443/ws/btcusdt@trade' },
  { provider: 'BYBIT', channel: 'REST', endpoint: 'https://api-testnet.bybit.com/v5/market/time' },
  { provider: 'BYBIT', channel: 'WS', endpoint: 'wss://stream-testnet.bybit.com/v5/public/linear' },
  { provider: 'KRAKEN', channel: 'REST', endpoint: 'https://api.kraken.com/0/public/Time' },
  { provider: 'KRAKEN', channel: 'WS', endpoint: 'wss://ws.kraken.com' },
  { provider: 'PUBLIC', channel: 'REST', endpoint: 'https://example.com/' }
];

export const E131_TIME_ENDPOINTS = ['https://worldtimeapi.org/api/timezone/Etc/UTC', 'https://timeapi.io/api/Time/current/zone?timeZone=UTC'];

export function runDirE131() { return path.resolve(process.env.TREASURE_RUN_DIR || '.run/treasure/E131_1700000000'); }
export function isCITruthy() { const ci = String(process.env.CI || ''); return ci === 'true' || ci === '1'; }
export function modeE131() {
  const m = ['OFFLINE_ONLY', 'ONLINE_OPTIONAL', 'ONLINE_REQUIRED'].filter((k) => process.env[k] === '1');
  if (m.length > 1) throw new Error(`E131_MODE_CONFLICT:${m.join(',')}`);
  return m[0] || 'OFFLINE_ONLY';
}

export function atomicWrite(p, b) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const t = `${p}.tmp-${process.pid}-${Date.now()}`;
  const fd = fs.openSync(t, 'w', 0o644);
  try { fs.writeFileSync(fd, b, 'utf8'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(t, p);
}

export function writeMdAtomic(p, t) { atomicWrite(p, `${String(t).replace(/\r\n/g, '\n').replace(/\s+$/gm, '').trimEnd()}\n`); }
export function cmdOut(c, a) { return spawnSync(c, a, { encoding: 'utf8' }).stdout.trim(); }
export function redactHash(v) { return v ? sha256Text(String(v)) : 'NONE'; }
export function redactShape(v) {
  if (!v) return 'NONE';
  try { const u = new URL(v); return `${u.protocol}//${u.hostname}:${u.port || (u.protocol === 'https:' ? '443' : '80')}`; } catch { return 'INVALID'; }
}

export function enforceCIBoundaryE131() {
  if (!isCITruthy()) return;
  for (const [k, vRaw] of Object.entries(process.env)) {
    const v = String(vRaw || '').trim(); if (!v) continue;
    if (k.startsWith('UPDATE_') || k === 'ENABLE_NET' || k.startsWith('ONLINE_') || k.startsWith('WS_') || k === 'I_UNDERSTAND_LIVE_RISK' || k === 'ARM_LIVE' || k === 'TESTNET') throw new Error(`E131_CI_FORBIDDEN_ENV:${k}`);
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

export function evidenceFingerprintE131() {
  const ignore = new Set(['CLOSEOUT.md', 'VERDICT.md', 'SHA256SUMS.md', 'SEAL_X2.md', 'REPLAY_X2.md']);
  return sha256Text(E131_REQUIRED.filter((f) => !ignore.has(f)).map((f) => {
    const full = path.join(E131_ROOT, f);
    return `${f}:${fs.existsSync(full) ? sha256File(full) : 'ABSENT'}`;
  }).join('\n'));
}
