#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { sha256File, sha256Text } from './e66_lib.mjs';

export const ROOT = path.resolve('reports/evidence/E142_MEGA');
export const FINAL_ROOT = path.resolve('reports/evidence/FINAL_MEGA');
export const TRUTH_CACHE = path.join(ROOT, 'TRUTH_CACHE.md');
export const CACHE_MAX_AGE_HOURS = 24;

export const REASONS = {
  OK: 'OK',
  FAIL_NODE_POLICY: 'FAIL_NODE_POLICY',
  FAIL_PINNED_NODE_HEALTH: 'FAIL_PINNED_NODE_HEALTH',
  FAIL_CAPSULE_INTEGRITY: 'FAIL_CAPSULE_INTEGRITY',
  FAIL_CONTRACTS: 'FAIL_CONTRACTS',
  FAIL_DOCTOR_SCHEMA: 'FAIL_DOCTOR_SCHEMA',
  NEED_NODE_TARBALL: 'NEED_NODE_TARBALL',
  NEED_BOOTSTRAP: 'NEED_BOOTSTRAP',
  PROBE_ONLY_NON_AUTHORITATIVE: 'PROBE_ONLY_NON_AUTHORITATIVE',
  SKIP_ONLINE_FLAGS_NOT_SET: 'SKIP_ONLINE_FLAGS_NOT_SET',
  E_PROXY_BLOCK: 'E_PROXY_BLOCK',
  E_TLS_INTERCEPT: 'E_TLS_INTERCEPT',
  E_WS_BLOCKED: 'E_WS_BLOCKED',
  E_DNS_FILTERED: 'E_DNS_FILTERED',
  E_NET_OK: 'E_NET_OK',
  CACHE_MISSING: 'CACHE_MISSING',
  CACHE_INVALID: 'CACHE_INVALID',
  CACHE_STALE: 'CACHE_STALE',
  CACHE_STALE_FILESYSTEM: 'CACHE_STALE_FILESYSTEM',
  AUTHORITATIVE_PASS: 'AUTHORITATIVE_PASS',
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

export function fpDir(root) {
  const files = fs.existsSync(root)
    ? fs.readdirSync(root).filter((f) => f.endsWith('.md') && !['SHA256SUMS.md', 'SEAL_X2.md'].includes(f)).sort()
    : [];
  return sha256Text(files.map((f) => `${f}:${sha256File(path.join(root, f))}`).join('\n'));
}
