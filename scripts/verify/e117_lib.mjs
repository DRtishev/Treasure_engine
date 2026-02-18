import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File, sha256Text } from './e66_lib.mjs';

export const E117_ROOT = path.resolve('reports/evidence/E117');
export const E117_BINDING = path.resolve('.foundation-seal/E117_INPUT_BINDING.json');

export function isCITruthy() { const ci = String(process.env.CI || ''); return ci === 'true' || ci === '1'; }
export function modeE117() {
  const m = ['OFFLINE_ONLY', 'ONLINE_OPTIONAL', 'ONLINE_REQUIRED'].filter((k) => process.env[k] === '1');
  if (m.length > 1) throw new Error(`E117_MODE_CONFLICT:${m.join(',')}`);
  return m[0] || 'ONLINE_OPTIONAL';
}
export function runDirE117() { return path.resolve(process.env.TREASURE_RUN_DIR || '.foundation-seal/runs/E117_1700000000'); }
export function enforceCIBoundaryE117() {
  if (!isCITruthy()) return;
  for (const [k, vRaw] of Object.entries(process.env)) {
    const v = String(vRaw || '').trim();
    if (!v) continue;
    if (k.startsWith('UPDATE_') || k === 'ENABLE_NET' || k === 'ENABLE_NETWORK_TESTS' || k.startsWith('ONLINE_') || k === 'I_UNDERSTAND_LIVE_RISK' || k.startsWith('WS_') || k === 'FORCE_NET_DOWN') throw new Error(`E117_CI_FORBIDDEN_ENV:${k}`);
  }
}
export function assertNetGateE117() {
  if (isCITruthy()) throw new Error('E117_NET_BLOCKED_CI');
  if (process.env.ENABLE_NET !== '1' || process.env.I_UNDERSTAND_LIVE_RISK !== '1') throw new Error('E117_NET_GUARD_BLOCKED');
}
export function atomicWrite(p, body) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const t = `${p}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(t, body, 'utf8');
  fs.renameSync(t, p);
}
export function writeMdAtomic(p, t) { atomicWrite(p, `${String(t).replace(/\r\n/g, '\n').replace(/\s+$/gm, '').trimEnd()}\n`); }
export function snapshotState(paths) {
  return sha256Text(paths.map((p) => {
    const a = path.resolve(p);
    if (!fs.existsSync(a)) return `${p}:ABSENT`;
    const st = fs.statSync(a);
    if (st.isFile()) return `${p}:FILE:${sha256File(a)}`;
    return `${p}:DIR:${sha256Text(fs.readdirSync(a).sort().join('|'))}`;
  }).join('\n'));
}
export function evidenceFingerprintE117() {
  const core = ['PREFLIGHT.md', 'CONTRACTS_SUMMARY.md', 'PERF_NOTES.md', 'NET_PROOF_QUORUM.md', 'WS_PROVIDERS.md', 'WS_CAPTURE.md', 'WS_REPLAY.md', 'PARITY_COURT_V2.md', 'NO_LOOKAHEAD_WS.md', 'REPLAY_BUNDLE.md', 'REPLAY_BUNDLE_MANIFEST.md', 'REPLAY_X2.md', 'ZERO_WRITES_ON_FAIL.md'];
  return sha256Text(core.map((f) => {
    const p = path.join(E117_ROOT, f);
    return `${f}:${fs.existsSync(p) ? sha256File(p) : 'ABSENT'}`;
  }).join('\n'));
}
export function anchorsE117() {
  const canon = (p) => {
    if (!fs.existsSync(path.resolve(p))) return 'ABSENT';
    const m = fs.readFileSync(path.resolve(p), 'utf8').match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
    return m ? m[1] : 'NOT_FOUND';
  };
  return { e116_canonical_fingerprint: canon('reports/evidence/E116/CLOSEOUT.md'), e117_run_hash: fs.existsSync('scripts/verify/e117_run.mjs') ? sha256File('scripts/verify/e117_run.mjs') : 'ABSENT' };
}
export function cmdOut(cmd, args) { return spawnSync(cmd, args, { encoding: 'utf8' }).stdout.trim(); }
export function readInputBinding() { return fs.existsSync(E117_BINDING) ? JSON.parse(fs.readFileSync(E117_BINDING, 'utf8')) : null; }
export function writeInputBinding(v) { atomicWrite(E117_BINDING, `${JSON.stringify(v, null, 2)}\n`); }
