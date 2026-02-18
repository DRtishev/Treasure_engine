import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File, sha256Text } from './e66_lib.mjs';

export const E118_ROOT = path.resolve('reports/evidence/E118');
export const E118_BINDING = path.resolve('.foundation-seal/E118_INPUT_BINDING.json');
export const E118_RUN_DIR = path.resolve(process.env.TREASURE_RUN_DIR || '.foundation-seal/runs/E118_1700000000');

export function isCITruthy() { const ci = String(process.env.CI || ''); return ci === 'true' || ci === '1'; }
export function modeE118() {
  const modes = ['OFFLINE_ONLY', 'ONLINE_OPTIONAL', 'ONLINE_REQUIRED'].filter((m) => process.env[m] === '1');
  if (modes.length > 1) throw new Error(`E118_MODE_CONFLICT:${modes.join(',')}`);
  return modes[0] || 'ONLINE_OPTIONAL';
}
export function enforceCIBoundaryE118() {
  if (!isCITruthy()) return;
  for (const [k, vRaw] of Object.entries(process.env)) {
    const v = String(vRaw || '').trim();
    if (!v) continue;
    if (k.startsWith('UPDATE_') || k === 'ENABLE_NET' || k.startsWith('ONLINE_') || k === 'I_UNDERSTAND_LIVE_RISK' || k.startsWith('WS_') || k === 'FORCE_NET_DOWN') throw new Error(`E118_CI_FORBIDDEN_ENV:${k}`);
  }
}
export function assertNetGateE118() {
  if (isCITruthy()) throw new Error('E118_NET_BLOCKED_CI');
  if (!(process.env.ENABLE_NET === '1' && process.env.I_UNDERSTAND_LIVE_RISK === '1')) throw new Error('E118_NET_GUARD_BLOCKED');
}
export function atomicWrite(p, body) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const t = `${p}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(t, body, 'utf8');
  fs.renameSync(t, p);
}
export function writeMdAtomic(p, text) { atomicWrite(p, `${String(text).replace(/\r\n/g, '\n').replace(/\s+$/gm, '').trimEnd()}\n`); }
export function snapshotState(paths) {
  const rows = paths.map((p) => {
    const a = path.resolve(p);
    if (!fs.existsSync(a)) return `${p}:ABSENT`;
    const st = fs.statSync(a);
    return st.isFile() ? `${p}:FILE:${sha256File(a)}` : `${p}:DIR:${sha256Text(fs.readdirSync(a).sort().join('|'))}`;
  });
  return sha256Text(rows.join('\n'));
}
export function evidenceFingerprintE118() {
  const files = ['PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','NET_PROOF_REAL.md','QUORUM_POLICY.md','ANTI_FAKE_FULL.md','REALITY_FUEL.md','DATA_LINEAGE.md','PARITY_COURT_V3.md','NO_LOOKAHEAD_WS.md','REPLAY_BUNDLE.md','REPLAY_X2.md','ZERO_WRITES_ON_FAIL.md'];
  return sha256Text(files.map((f) => `${f}:${fs.existsSync(path.join(E118_ROOT, f)) ? sha256File(path.join(E118_ROOT, f)) : 'ABSENT'}`).join('\n'));
}
export function anchorsE118() {
  const canon = (p) => {
    if (!fs.existsSync(path.resolve(p))) return 'ABSENT';
    const m = fs.readFileSync(path.resolve(p), 'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
    return m ? m[1] : 'NOT_FOUND';
  };
  return { e117_canonical_fingerprint: canon('reports/evidence/E117/CLOSEOUT.md'), e118_run_hash: fs.existsSync('scripts/verify/e118_run.mjs') ? sha256File('scripts/verify/e118_run.mjs') : 'ABSENT' };
}
export function cmdOut(cmd, args) { return spawnSync(cmd, args, { encoding: 'utf8' }).stdout.trim(); }
