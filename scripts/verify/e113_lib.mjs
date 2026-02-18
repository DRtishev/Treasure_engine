import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File, sha256Text } from './e66_lib.mjs';

export const E113_ROOT = path.resolve('reports/evidence/E113');

export function isCITruthy() {
  const ci = String(process.env.CI || '');
  return ci === 'true' || ci === '1';
}

export function modeE113() {
  const modes = ['OFFLINE_ONLY', 'ONLINE_OPTIONAL', 'ONLINE_REQUIRED'].filter(k => process.env[k] === '1');
  if (modes.length > 1) throw new Error(`E113_MODE_CONFLICT:${modes.join(',')}`);
  return modes[0] || 'ONLINE_OPTIONAL';
}

export function enforceCIBoundaryE113() {
  if (!isCITruthy()) return;
  const badPrefixes = ['UPDATE_', 'ONLINE_', 'LIVE_'];
  const badExact = ['ENABLE_NET', 'I_UNDERSTAND_LIVE_RISK', 'FORCE_NET_DOWN'];
  for (const k of Object.keys(process.env)) {
    const v = String(process.env[k] || '').trim();
    if (!v) continue;
    if (badPrefixes.some(p => k.startsWith(p)) || badExact.includes(k)) {
      throw new Error(`E113_CI_FORBIDDEN_ENV:${k}`);
    }
  }
}

export function assertNetGate() {
  if (isCITruthy()) throw new Error('E113_NET_FORBIDDEN_IN_CI');
  if (process.env.ENABLE_NET !== '1' || process.env.I_UNDERSTAND_LIVE_RISK !== '1') {
    throw new Error('E113_NET_GUARD_BLOCKED');
  }
}

export function runStamp() {
  return `E113_${process.env.SOURCE_DATE_EPOCH || '1700000000'}`;
}

export function getRunDir() {
  return path.resolve(process.env.TREASURE_RUN_DIR || path.join('.foundation-seal', 'runs', runStamp()));
}

export function getCapsulePinDir() {
  return path.resolve(path.join('.foundation-seal', 'capsules', runStamp()));
}

export function atomicWrite(dest, body) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.tmp-${process.pid}-${Date.now()}`;
  const fd = fs.openSync(tmp, 'w', 0o644);
  try {
    fs.writeFileSync(fd, body, 'utf8');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, dest);
}

export function writeMdAtomic(p, text) {
  const body = `${text.replace(/\r\n/g, '\n').replace(/\s+$/gm, '').trimEnd()}\n`;
  atomicWrite(p, body);
}

export function snapshotState(paths) {
  const rows = [];
  for (const p of paths) {
    const full = path.resolve(p);
    if (!fs.existsSync(full)) { rows.push(`${p}:ABSENT`); continue; }
    const st = fs.statSync(full);
    if (st.isFile()) rows.push(`${p}:FILE:${sha256File(full)}`);
    else {
      const files = fs.readdirSync(full).sort();
      rows.push(`${p}:DIR:${sha256Text(files.join('|'))}`);
    }
  }
  return sha256Text(rows.join('\n'));
}

export function evidenceFingerprintE113() {
  const core = [
    'PREFLIGHT.md','CONTRACTS_SUMMARY.md','PERF_NOTES.md','NET_PROOF.md','REALITY_FUEL.md','CAPSULE_MANIFEST.md',
    'REPLAY_BUNDLE.md','REPLAY_X2.md','ZERO_WRITES_ON_FAIL.md'
  ];
  const parts = [];
  for (const f of core) {
    const p = path.join(E113_ROOT, f);
    if (fs.existsSync(p)) parts.push(`${f}:${sha256File(p)}`);
  }
  return sha256Text(parts.join('\n'));
}

export function anchorsE113() {
  const readCanon = (p) => {
    if (!fs.existsSync(path.resolve(p))) return 'ABSENT';
    const t = fs.readFileSync(path.resolve(p), 'utf8');
    const m = t.match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
    return m ? m[1] : 'NOT_FOUND';
  };
  return {
    e112_canonical_fingerprint: readCanon('reports/evidence/E112/CLOSEOUT.md'),
    e113_run_hash: fs.existsSync('scripts/verify/e113_run.mjs') ? sha256File('scripts/verify/e113_run.mjs') : 'ABSENT',
    e113_evidence_hash: fs.existsSync('scripts/verify/e113_evidence.mjs') ? sha256File('scripts/verify/e113_evidence.mjs') : 'ABSENT'
  };
}

export function latestPinnedDir() {
  const base = path.resolve('.foundation-seal/capsules');
  if (!fs.existsSync(base)) return null;
  const dirs = fs.readdirSync(base).filter(d => /^E11[23]_\d+$/.test(d)).sort();
  if (!dirs.length) return null;
  return path.join(base, dirs[dirs.length - 1]);
}

export function cmdOut(cmd, args) {
  return spawnSync(cmd, args, { encoding: 'utf8' }).stdout.trim();
}
