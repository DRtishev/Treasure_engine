import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File, sha256Text } from './e66_lib.mjs';

export const E116_ROOT = path.resolve('reports/evidence/E116');
export const E116_BINDING = path.resolve('.foundation-seal/E116_INPUT_BINDING.json');

export function isCITruthy() { const ci = String(process.env.CI || ''); return ci === 'true' || ci === '1'; }
export function modeE116() {
  const m = ['OFFLINE_ONLY', 'ONLINE_OPTIONAL', 'ONLINE_REQUIRED'].filter((k) => process.env[k] === '1');
  if (m.length > 1) throw new Error(`E116_MODE_CONFLICT:${m.join(',')}`);
  return m[0] || 'ONLINE_OPTIONAL';
}
export function stampE116() { return `E116_${process.env.SOURCE_DATE_EPOCH || '1700000000'}`; }
export function runDirE116() { return path.resolve(process.env.TREASURE_RUN_DIR || path.join('.foundation-seal', 'runs', stampE116())); }
export function wsDirE116() { return path.join(runDirE116(), 'ws'); }
export function pinDirE116() { return path.join(runDirE116(), 'pinned', stampE116()); }

export function enforceCIBoundaryE116() {
  if (!isCITruthy()) return;
  for (const [k, vRaw] of Object.entries(process.env)) {
    const v = String(vRaw || '').trim();
    if (!v) continue;
    if (k.startsWith('UPDATE_') || k === 'ENABLE_NET' || k === 'ENABLE_NETWORK_TESTS' || k.startsWith('ONLINE_') || k === 'I_UNDERSTAND_LIVE_RISK' || k.startsWith('WS_') || k === 'FORCE_NET_DOWN') throw new Error(`E116_CI_FORBIDDEN_ENV:${k}`);
  }
}
export function assertNetGateE116() {
  if (isCITruthy()) throw new Error('E116_NET_BLOCKED_CI');
  if (process.env.ENABLE_NET !== '1' || process.env.I_UNDERSTAND_LIVE_RISK !== '1') throw new Error('E116_NET_GUARD_BLOCKED');
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
  const rows = [];
  for (const p of paths) {
    const a = path.resolve(p);
    if (!fs.existsSync(a)) { rows.push(`${p}:ABSENT`); continue; }
    const st = fs.statSync(a);
    if (st.isFile()) rows.push(`${p}:FILE:${sha256File(a)}`);
    else rows.push(`${p}:DIR:${sha256Text(fs.readdirSync(a).sort().join('|'))}`);
  }
  return sha256Text(rows.join('\n'));
}

export function readInputBinding() { return fs.existsSync(E116_BINDING) ? JSON.parse(fs.readFileSync(E116_BINDING, 'utf8')) : null; }
export function writeInputBinding(v) { atomicWrite(E116_BINDING, `${JSON.stringify(v, null, 2)}\n`); }

export function evidenceFingerprintE116() {
  const core = ['PREFLIGHT.md', 'CONTRACTS_SUMMARY.md', 'PERF_NOTES.md', 'WS_CAPTURE.md', 'WS_REPLAY.md', 'NET_PROOF_WS.md', 'PARITY_COURT.md', 'NO_LOOKAHEAD_WS.md', 'PROMOTION_REPORT.md', 'CANDIDATE_BOARD.md', 'GRADUATION_BRIDGE.md', 'COURT_VERDICTS.md', 'REPLAY_BUNDLE.md', 'ZERO_WRITES_ON_FAIL.md'];
  const parts = [];
  for (const f of core) {
    const p = path.join(E116_ROOT, f);
    if (fs.existsSync(p)) parts.push(`${f}:${sha256File(p)}`);
  }
  return sha256Text(parts.join('\n'));
}

export function anchorsE116() {
  const canon = (p) => {
    if (!fs.existsSync(path.resolve(p))) return 'ABSENT';
    const t = fs.readFileSync(path.resolve(p), 'utf8');
    const m = t.match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
    return m ? m[1] : 'NOT_FOUND';
  };
  return {
    e115_canonical_fingerprint: canon('reports/evidence/E115/CLOSEOUT.md'),
    e116_run_hash: fs.existsSync('scripts/verify/e116_run.mjs') ? sha256File('scripts/verify/e116_run.mjs') : 'ABSENT'
  };
}

export function cmdOut(cmd, args) { return spawnSync(cmd, args, { encoding: 'utf8' }).stdout.trim(); }
