import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File, sha256Text } from './e66_lib.mjs';

export const E133_ROOT = path.resolve('reports/evidence/E133');
export const E133_REQUIRED = [
  'PREFLIGHT.md','E131_DRIFT_ROOT_CAUSE.md','E131_REPAIR_REPORT.md','PROXY_BREAKOUT_MATRIX.md','TRANSPORT_STAGE_MATRIX.md','TIME_SYNC.md','QUORUM_SUMMARY.md','ANTI_FAKE_FULL.md','ZERO_WRITES_ON_FAIL.md','CLOSEOUT.md','VERDICT.md','SHA256SUMS.md','SEAL_X2.md','REPLAY_X2.md','CODEX_REPORT.md'
];
export const E133_TARGETS = [
  { provider: 'BINANCE', channel: 'REST', endpoint: 'https://api.binance.com/api/v3/time' },
  { provider: 'BINANCE', channel: 'WS', endpoint: 'wss://stream.binance.com:443/ws/btcusdt@trade' },
  { provider: 'BYBIT', channel: 'REST', endpoint: 'https://api-testnet.bybit.com/v5/market/time' },
  { provider: 'BYBIT', channel: 'WS', endpoint: 'wss://stream-testnet.bybit.com/v5/public/linear' },
  { provider: 'PUBLIC', channel: 'REST', endpoint: 'https://example.com/' }
];

export function modeE133() { const m = ['OFFLINE_ONLY', 'ONLINE_OPTIONAL', 'ONLINE_REQUIRED'].filter((k) => process.env[k] === '1'); if (m.length > 1) throw new Error(`E133_MODE_CONFLICT:${m.join(',')}`); return m[0] || 'OFFLINE_ONLY'; }
export function isCITruthy() { const ci = String(process.env.CI || ''); return ci === 'true' || ci === '1'; }
export function runDirE133() { return path.resolve(process.env.TREASURE_RUN_DIR || '.run/treasure/E133_1700000000'); }
export function atomicWrite(p, b) { fs.mkdirSync(path.dirname(p), { recursive: true }); const t = `${p}.tmp-${process.pid}-${Date.now()}`; fs.writeFileSync(t, b, 'utf8'); fs.renameSync(t, p); }
export function writeMdAtomic(p, t) { atomicWrite(p, `${String(t).replace(/\r\n/g, '\n').replace(/\s+$/gm, '').trimEnd()}\n`); }
export function cmdOut(c, a) { return spawnSync(c, a, { encoding: 'utf8' }).stdout.trim(); }
export function enforceCIBoundaryE133() { if (!isCITruthy()) return; for (const [k, vRaw] of Object.entries(process.env)) { const v = String(vRaw || '').trim(); if (!v) continue; if (k.startsWith('UPDATE_') || k === 'ENABLE_NET' || k.startsWith('ONLINE_') || k === 'I_UNDERSTAND_LIVE_RISK' || k === 'FORCE_NET_DOWN') throw new Error(`E133_CI_FORBIDDEN_ENV:${k}`); } }
export function snapshotState(paths) { return sha256Text(paths.map((p) => { const a = path.resolve(p); if (!fs.existsSync(a)) return `${p}:ABSENT`; const st = fs.statSync(a); if (st.isFile()) return `${p}:FILE:${sha256File(a)}`; return `${p}:DIR:${sha256Text(fs.readdirSync(a).sort().join('|'))}`; }).join('\n')); }
export function evidenceFingerprintE133() { const ignore = new Set(['CLOSEOUT.md', 'VERDICT.md', 'SHA256SUMS.md', 'SEAL_X2.md', 'REPLAY_X2.md']); return sha256Text(E133_REQUIRED.filter((f) => !ignore.has(f)).map((f) => { const full = path.join(E133_ROOT, f); return `${f}:${fs.existsSync(full) ? sha256File(full) : 'ABSENT'}`; }).join('\n')); }
