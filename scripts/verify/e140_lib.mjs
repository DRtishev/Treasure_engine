#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { sha256File, sha256Text } from './e66_lib.mjs';

export const E140_ROOT = path.resolve('reports/evidence/E140');
export const NODE_VERSION = '24.12.0';
export const NODE_ARCHIVE_BASENAME = `node-v${NODE_VERSION}-linux-x64`;
export const NODE_TARBALL_XZ = path.resolve(`artifacts/incoming/node/${NODE_ARCHIVE_BASENAME}.tar.xz`);
export const NODE_TARBALL_GZ = path.resolve(`artifacts/incoming/node/${NODE_ARCHIVE_BASENAME}.tar.gz`);
export const NODE_SHA_FILE = path.resolve(`artifacts/incoming/node/${NODE_ARCHIVE_BASENAME}.sha256`);
export const NODE_INSTALL_DIR = path.resolve(`tools/node/v${NODE_VERSION}/linux-x64`);
export const NODE_BIN = path.join(NODE_INSTALL_DIR, 'bin/node');

export const REASON = {
  OK: 'OK',
  NEED_NODE_TARBALL: 'NEED_NODE_TARBALL',
  NEED_FLAGS_FOR_ONLINE: 'NEED_FLAGS_FOR_ONLINE',
  FAIL_NODE_POLICY: 'FAIL_NODE_POLICY',
  AUTHORITATIVE_READY: 'AUTHORITATIVE_READY',
  PROBE_ONLY_NON_AUTHORITATIVE: 'PROBE_ONLY_NON_AUTHORITATIVE',
  BLOCKED: 'BLOCKED',
};

export function writeMd(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${String(content).replace(/\r\n/g, '\n').trimEnd()}\n`, 'utf8');
}

export function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  return { ec: r.status ?? 1, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}

export function env1(name) { return String(process.env[name] || '') === '1'; }

export function redactedProxy() {
  const raw = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY || '';
  if (!raw) return { present: false, scheme: 'none', shape_hash: 'none' };
  try {
    const u = new URL(raw);
    const hostport = `${u.hostname}:${u.port || (u.protocol === 'https:' ? '443' : '80')}`;
    return { present: true, scheme: u.protocol.replace(':', ''), shape_hash: createHash('sha256').update(hostport).digest('hex').slice(0, 16) };
  } catch {
    return { present: true, scheme: 'unknown', shape_hash: createHash('sha256').update(raw).digest('hex').slice(0, 16) };
  }
}

export function fingerprint(inputs) {
  return sha256Text(inputs.join('\n'));
}

export function detectTarball() {
  if (fs.existsSync(NODE_TARBALL_XZ)) return NODE_TARBALL_XZ;
  if (fs.existsSync(NODE_TARBALL_GZ)) return NODE_TARBALL_GZ;
  return '';
}

export function shaOrNA(file) {
  return fs.existsSync(file) ? sha256File(file) : 'NA';
}
