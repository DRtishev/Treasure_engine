import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File, sha256Text } from './e66_lib.mjs';

export const E120_ROOT = path.resolve('reports/evidence/E120');
export const E120_BINDING = path.resolve('.foundation-seal/E120_INPUT_BINDING.json');
export function runDirE120() { return path.resolve(process.env.TREASURE_RUN_DIR || '.run/treasure/E120_1700000000'); }
export function isCITruthy() { const ci = String(process.env.CI || ''); return ci === 'true' || ci === '1'; }
export function modeE120() {
  const modes = ['OFFLINE_ONLY', 'ONLINE_OPTIONAL', 'ONLINE_REQUIRED'].filter((k) => process.env[k] === '1');
  if (modes.length > 1) throw new Error(`E120_MODE_CONFLICT:${modes.join(',')}`);
  return modes[0] || 'OFFLINE_ONLY';
}
export function atomicWrite(p, body) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.tmp-${process.pid}-${Date.now()}`;
  const fd = fs.openSync(tmp, 'w', 0o644);
  try { fs.writeFileSync(fd, body, 'utf8'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(tmp, p);
}
export function writeMdAtomic(p, text) { atomicWrite(p, `${String(text).replace(/\r\n/g, '\n').replace(/\s+$/gm, '').trimEnd()}\n`); }
export function enforceCIBoundaryE120() {
  if (!isCITruthy()) return;
  for (const [k, vRaw] of Object.entries(process.env)) {
    const v = String(vRaw || '').trim();
    if (!v) continue;
    if (k.startsWith('UPDATE_') || k === 'ENABLE_NET' || k.startsWith('ONLINE_') || k.startsWith('LIVE_') || k === 'ENABLE_LIVE_ORDERS' || k.startsWith('WS_') || k === 'I_UNDERSTAND_LIVE_RISK' || k === 'CLEAR_E120_KILL_LOCK') throw new Error(`E120_CI_FORBIDDEN_ENV:${k}`);
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
export function evidenceFingerprintE120() {
  const files = ['PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','EXECUTION_ADAPTER.md','LIVE_SAFETY.md','MICRO_LIVE_RUN.md','LEDGER_DAILY_REPORT.md','REPLAY_BUNDLE.md','REPLAY_X2.md','ZERO_WRITES_ON_FAIL.md'];
  return sha256Text(files.map((f) => `${f}:${fs.existsSync(path.join(E120_ROOT, f)) ? sha256File(path.join(E120_ROOT, f)) : 'ABSENT'}`).join('\n'));
}
export function anchorsE120() {
  const readCanon = (p) => {
    if (!fs.existsSync(path.resolve(p))) return 'ABSENT';
    const m = fs.readFileSync(path.resolve(p), 'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
    return m ? m[1] : 'NOT_FOUND';
  };
  return {
    e119_canonical_fingerprint: readCanon('reports/evidence/E119/CLOSEOUT.md'),
    e120_run_hash: fs.existsSync('scripts/verify/e120_run.mjs') ? sha256File('scripts/verify/e120_run.mjs') : 'ABSENT'
  };
}
export function cmdOut(cmd, args) { return spawnSync(cmd, args, { encoding: 'utf8' }).stdout.trim(); }
