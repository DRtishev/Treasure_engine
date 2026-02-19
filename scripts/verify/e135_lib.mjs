#!/usr/bin/env node
// E135 Library — shared constants, helpers, CI boundary, fingerprinting.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File, sha256Text } from './e66_lib.mjs';

export const E135_ROOT = path.resolve('reports/evidence/E135');
export const E135_REQUIRED = [
  'TRANSPORT_HARNESS_MATRIX.md',
  'HARNESS_RUN.md',
  'REASON_CODES.md',
  'CONTRACTS.md',
  'VERDICT.md',
  'EXPORT_MANIFEST.md',
  'EXPORT_RECEIPT.md',
  'SHA256SUMS.md',
];

export function isCITruthy() {
  const ci = String(process.env.CI || '');
  return ci === 'true' || ci === '1';
}

export function atomicWrite(p, b) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const t = `${p}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(t, b, 'utf8');
  fs.renameSync(t, p);
}

export function writeMdAtomic(p, t) {
  atomicWrite(p, `${String(t).replace(/\r\n/g, '\n').replace(/\s+$/gm, '').trimEnd()}\n`);
}

export function cmdOut(c, a) {
  return spawnSync(c, a, { encoding: 'utf8' }).stdout.trim();
}

export function enforceCIBoundaryE135() {
  if (!isCITruthy()) return;
  for (const [k, vRaw] of Object.entries(process.env)) {
    const v = String(vRaw || '').trim();
    if (!v) continue;
    if (
      k.startsWith('UPDATE_') ||
      k === 'ENABLE_NET' ||
      k.startsWith('ONLINE_') ||
      k === 'I_UNDERSTAND_LIVE_RISK' ||
      k === 'FORCE_NET_DOWN'
    ) throw new Error(`E135_CI_FORBIDDEN_ENV:${k}`);
  }
}

export function snapshotState(paths) {
  return sha256Text(
    paths.map((p) => {
      const a = path.resolve(p);
      if (!fs.existsSync(a)) return `${p}:ABSENT`;
      const st = fs.statSync(a);
      if (st.isFile()) return `${p}:FILE:${sha256File(a)}`;
      return `${p}:DIR:${sha256Text(fs.readdirSync(a).sort().join('|'))}`;
    }).join('\n'),
  );
}

export function evidenceFingerprintE135() {
  const ignore = new Set(['VERDICT.md', 'SHA256SUMS.md', 'EXPORT_RECEIPT.md']);
  return sha256Text(
    E135_REQUIRED
      .filter((f) => !ignore.has(f))
      .map((f) => {
        const full = path.join(E135_ROOT, f);
        return `${f}:${fs.existsSync(full) ? sha256File(full) : 'ABSENT'}`;
      })
      .join('\n'),
  );
}
