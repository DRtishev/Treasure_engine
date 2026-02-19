#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File, sha256Text } from './e66_lib.mjs';

export const E137_ROOT = path.resolve('reports/evidence/E137');
export const REQUIRED_E137_FILES = [
  'SNAPSHOT.md',
  'OFFLINE_MATRIX.md',
  'ONLINE_MATRIX.md',
  'TRANSFER_PROTOCOL.md',
  'EXPORT_MANIFEST.md',
  'EXPORT_RECEIPT.md',
  'IMPORT_REPORT.md',
  'CONTRACTS.md',
  'SEAL_X2.md',
  'VERDICT.md',
  'SHA256SUMS.md',
];

export const REASON = {
  OK: 'OK',
  SKIP_ONLINE_FLAGS_NOT_SET: 'SKIP_ONLINE_FLAGS_NOT_SET',
  SKIP_IMPORT_NOT_REQUESTED: 'SKIP_IMPORT_NOT_REQUESTED',
  FAIL_NODE_POLICY: 'FAIL_NODE_POLICY',
  FAIL_MD_ONLY: 'FAIL_MD_ONLY',
  FAIL_REDACTION: 'FAIL_REDACTION',
  FAIL_HEADER_EXACT: 'FAIL_HEADER_EXACT',
  FAIL_SHA_MISMATCH: 'FAIL_SHA_MISMATCH',
  FAIL_IMPORT_STRUCTURE: 'FAIL_IMPORT_STRUCTURE',
  FAIL_PROXY_POLICY: 'FAIL_PROXY_POLICY',
  FAIL_WS_UPGRADE: 'FAIL_WS_UPGRADE',
  FAIL_HTTP_EGRESS: 'FAIL_HTTP_EGRESS',
};

export const FINGERPRINT_FILES = new Set([
  'OFFLINE_MATRIX.md',
  'ONLINE_MATRIX.md',
  'TRANSFER_PROTOCOL.md',
  'EXPORT_MANIFEST.md',
  'IMPORT_REPORT.md',
  'CONTRACTS.md',
  'VERDICT.md',
]);

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

export function writeMd(file, content) {
  ensureDir(path.dirname(file));
  const normalized = `${String(content).replace(/\r\n/g, '\n').replace(/\s+$/gm, '').trimEnd()}\n`;
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, normalized, 'utf8');
  fs.renameSync(tmp, file);
}

export function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  return { ec: res.status ?? 1, out: (res.stdout || '').trim(), err: (res.stderr || '').trim() };
}

export function envFlag(name) {
  return String(process.env[name] || '') === '1';
}

export function evidenceFingerprintE137() {
  const parts = [...FINGERPRINT_FILES].sort().map((f) => {
    const p = path.join(E137_ROOT, f);
    return `${f}:${fs.existsSync(p) ? sha256File(p) : 'ABSENT'}`;
  }).join('\n');
  return sha256Text(parts);
}
