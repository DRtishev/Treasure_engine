#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { sha256File, sha256Text } from './e66_lib.mjs';

export const ROOT = path.resolve('reports/evidence/E142_MEGA');
export const REASONS = {
  OK: 'OK',
  FAIL_NODE_POLICY: 'FAIL_NODE_POLICY',
  NEED_NODE_TARBALL: 'NEED_NODE_TARBALL',
  PROBE_ONLY_NON_AUTHORITATIVE: 'PROBE_ONLY_NON_AUTHORITATIVE',
  AUTHORITATIVE_READY: 'AUTHORITATIVE_READY',
  SKIP_ONLINE_FLAGS_NOT_SET: 'SKIP_ONLINE_FLAGS_NOT_SET',
};

export function writeMd(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${String(content).replace(/\r\n/g, '\n').trimEnd()}\n`, 'utf8');
}
export function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  return { ec: r.status ?? 1, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}
export function env1(k) { return String(process.env[k] || '') === '1'; }

export function proxyRedacted() {
  const raw = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY || '';
  if (!raw) return { present: false, scheme: 'none', shape_hash: 'none' };
  try {
    const u = new URL(raw);
    const hp = `${u.hostname}:${u.port || (u.protocol === 'https:' ? '443' : '80')}`;
    return { present: true, scheme: u.protocol.replace(':', ''), shape_hash: createHash('sha256').update(hp).digest('hex').slice(0, 16) };
  } catch {
    return { present: true, scheme: 'unknown', shape_hash: createHash('sha256').update(raw).digest('hex').slice(0, 16) };
  }
}

export function fpE142() {
  const files = fs.existsSync(ROOT)
    ? fs.readdirSync(ROOT).filter((f) => f.endsWith('.md') && !['SHA256SUMS.md', 'SEAL_X2.md'].includes(f)).sort()
    : [];
  return sha256Text(files.map((f) => `${f}:${sha256File(path.join(ROOT, f))}`).join('\n'));
}
