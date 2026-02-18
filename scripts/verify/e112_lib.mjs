import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { sha256File, sha256Text } from './e66_lib.mjs';

export const E112_ROOT = path.resolve('reports/evidence/E112');
export const SNAP_ROOT = path.resolve('.foundation-seal/capsules');

export function isCITruthy() {
  const ci = String(process.env.CI || '');
  return ci === 'true' || ci === '1';
}

export function modeState() {
  const modes = ['OFFLINE_ONLY', 'ONLINE_OPTIONAL', 'ONLINE_REQUIRED'].filter(k => process.env[k] === '1');
  if (modes.length > 1) throw new Error(`E112_MODE_CONFLICT:${modes.join(',')}`);
  if (modes.length === 0) return 'ONLINE_OPTIONAL';
  return modes[0];
}

export function enforceCIBoundaryE112() {
  if (!isCITruthy()) return;
  const forbiddenPrefixes = ['UPDATE_', 'ONLINE_'];
  const forbiddenExact = ['ENABLE_NET', 'I_UNDERSTAND_LIVE_RISK', 'FORCE_NET_DOWN'];
  for (const key of Object.keys(process.env)) {
    const val = String(process.env[key] || '').trim();
    if (!val) continue;
    if (forbiddenPrefixes.some(p => key.startsWith(p)) || forbiddenExact.includes(key)) {
      throw new Error(`E112_CI_FORBIDDEN_ENV:${key}`);
    }
  }
}

export function assertNetGuard() {
  if (isCITruthy()) throw new Error('E112_NET_FORBIDDEN_CI');
  if (process.env.ENABLE_NET !== '1' || process.env.I_UNDERSTAND_LIVE_RISK !== '1') {
    throw new Error('E112_NET_GUARD_BLOCKED');
  }
}

export function atomicWriteFile(destPath, content) {
  const dir = path.dirname(destPath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`);
  const fd = fs.openSync(tmp, 'w', 0o644);
  try {
    fs.writeFileSync(fd, content, 'utf8');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, destPath);
}

export function writeMdAtomic(filePath, text) {
  const normalized = `${text.replace(/\r\n/g, '\n').replace(/\s+$/gm, '').trimEnd()}\n`;
  atomicWriteFile(filePath, normalized);
}

export function listEvidenceMd() {
  return fs.readdirSync(E112_ROOT).filter(f => f.endsWith('.md')).sort();
}

export function anchorsE112() {
  const hashOrAbsent = (p) => fs.existsSync(path.resolve(p)) ? sha256File(path.resolve(p)) : 'ABSENT';
  const readCanon = (p) => {
    if (!fs.existsSync(path.resolve(p))) return 'ABSENT';
    const t = fs.readFileSync(path.resolve(p), 'utf8');
    const m = t.match(/canonical_fingerprint:\s*([a-f0-9]{64})/);
    return m ? m[1] : 'NOT_FOUND';
  };
  return {
    e111_canonical_fingerprint: readCanon('reports/evidence/E111/CLOSEOUT.md'),
    e112_lib_hash: hashOrAbsent('scripts/verify/e112_lib.mjs'),
    e112_run_hash: hashOrAbsent('scripts/verify/e112_run.mjs'),
    e112_evidence_hash: hashOrAbsent('scripts/verify/e112_evidence.mjs'),
    e112_contracts_pack_hash: hashOrAbsent('scripts/verify/e112_contracts_pack.mjs')
  };
}

export function evidenceFingerprintE112() {
  const core = [
    'PREFLIGHT.md', 'CONTRACTS_SUMMARY.md', 'PERF_NOTES.md', 'REALITY_FUEL.md', 'NET_PROOF.md',
    'DATA_QUORUM_V4.md', 'CAPSULE_MANIFEST.md', 'SNAPSHOT_LOCK.md', 'SNAPSHOT_INTEGRITY.md',
    'EXEC_CALIBRATION.md', 'GAP_COST_REPORT.md', 'CANDIDATE_BOARD_V4.md', 'COURT_VERDICTS.md',
    'GRADUATION_BITE.md', 'LEDGER_SUMMARY.md', 'DAILY_REPORT.md'
  ];
  const parts = [];
  for (const f of core) {
    const p = path.join(E112_ROOT, f);
    if (fs.existsSync(p)) parts.push(`${f}:${sha256File(p)}`);
  }
  const seal = path.join(E112_ROOT, 'SEAL_X2.md');
  if (fs.existsSync(seal)) parts.push(`SEAL_X2.md:${sha256File(seal)}`);
  return sha256Text(parts.join('\n'));
}

export function snapshotState(paths) {
  const rows = [];
  for (const p of paths) {
    const full = path.resolve(p);
    if (!fs.existsSync(full)) {
      rows.push(`${p}:ABSENT`);
      continue;
    }
    const st = fs.statSync(full);
    if (st.isFile()) rows.push(`${p}:FILE:${sha256File(full)}`);
    else if (st.isDirectory()) {
      const names = fs.readdirSync(full).sort();
      const sig = names.map(n => {
        const c = path.join(full, n);
        const cs = fs.statSync(c);
        if (cs.isFile()) return `${n}:${sha256File(c)}`;
        return `${n}:DIR`;
      }).join('|');
      rows.push(`${p}:DIR:${sha256Text(sig)}`);
    }
  }
  return sha256Text(rows.join('\n'));
}

export function envSnapshotLines() {
  return [
    `- node: ${process.version}`,
    `- os: ${os.platform()} ${os.release()}`,
    `- mode: ${modeState()}`,
    `- ci: ${String(process.env.CI || '')}`
  ];
}
