import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File, sha256Text } from './e66_lib.mjs';

export const E119_ROOT = path.resolve('reports/evidence/E119');
export const E119_BINDING = path.resolve('.foundation-seal/E119_INPUT_BINDING.json');
export function runDirE119() { return path.resolve(process.env.TREASURE_RUN_DIR || '.foundation-seal/runs/E119_1700000000'); }
export function isCITruthy() { const ci = String(process.env.CI || ''); return ci === 'true' || ci === '1'; }
export function modeE119() {
  const m = ['OFFLINE_ONLY', 'ONLINE_OPTIONAL', 'ONLINE_REQUIRED'].filter((k) => process.env[k] === '1');
  if (m.length > 1) throw new Error(`E119_MODE_CONFLICT:${m.join(',')}`);
  return m[0] || 'ONLINE_OPTIONAL';
}
export function enforceCIBoundaryE119() {
  if (!isCITruthy()) return;
  for (const [k, vRaw] of Object.entries(process.env)) {
    const v = String(vRaw || '').trim();
    if (!v) continue;
    if (k.startsWith('UPDATE_') || k === 'ENABLE_NET' || k.startsWith('ONLINE_') || k === 'I_UNDERSTAND_LIVE_RISK' || k.startsWith('WS_') || k === 'FORCE_NET_DOWN') throw new Error(`E119_CI_FORBIDDEN_ENV:${k}`);
  }
}
export function atomicWrite(p, body) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const t = `${p}.tmp-${process.pid}-${Date.now()}`;
  const fd = fs.openSync(t, 'w', 0o644);
  try { fs.writeFileSync(fd, body, 'utf8'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(t, p);
}
export function writeMdAtomic(p, t) { atomicWrite(p, `${String(t).replace(/\r\n/g, '\n').replace(/\s+$/gm, '').trimEnd()}\n`); }
export function snapshotState(paths) {
  return sha256Text(paths.map((p) => {
    const a = path.resolve(p);
    if (!fs.existsSync(a)) return `${p}:ABSENT`;
    const st = fs.statSync(a);
    return st.isFile() ? `${p}:FILE:${sha256File(a)}` : `${p}:DIR:${sha256Text(fs.readdirSync(a).sort().join('|'))}`;
  }).join('\n'));
}
export function evidenceFingerprintE119() {
  const files = ['PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','QUORUM_WINDOWS.md','LIVE_CONFIRM_MATRIX.md','QUORUM_SCORE.md','ANTI_FAKE_FULL.md','DATA_LINEAGE.md','REALITY_FUEL.md','PARITY_COURT_V4.md','NO_LOOKAHEAD_WS.md','REPLAY_BUNDLE.md','REPLAY_X2.md','ZERO_WRITES_ON_FAIL.md'];
  return sha256Text(files.map((f) => `${f}:${fs.existsSync(path.join(E119_ROOT, f)) ? sha256File(path.join(E119_ROOT, f)) : 'ABSENT'}`).join('\n'));
}
export function anchorsE119() {
  const getCanon = (p) => {
    if (!fs.existsSync(path.resolve(p))) return 'ABSENT';
    const m = fs.readFileSync(path.resolve(p), 'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
    return m ? m[1] : 'NOT_FOUND';
  };
  return { e118_canonical_fingerprint: getCanon('reports/evidence/E118/CLOSEOUT.md'), e119_run_hash: fs.existsSync('scripts/verify/e119_run.mjs') ? sha256File('scripts/verify/e119_run.mjs') : 'ABSENT' };
}
export function cmdOut(cmd, args) { return spawnSync(cmd, args, { encoding: 'utf8' }).stdout.trim(); }
