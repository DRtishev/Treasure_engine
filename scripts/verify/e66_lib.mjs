#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const E66_ROOT = path.resolve('reports/evidence/E66');
export const LOCK_DIR = path.resolve('.foundation-seal');
export const LOCK_PATH = path.join(LOCK_DIR, 'PIPELINE.lock');
export const CAS_DIR = path.join(LOCK_DIR, 'cas');
export const SNAP_DIR = path.join(LOCK_DIR, 'snapshots');
export const RUN_DIR = path.join(LOCK_DIR, 'runs');

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

export function sha256Text(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((x) => stableJson(x)).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableJson(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function normalizeFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  if (filePath.endsWith('.json')) {
    const parsed = JSON.parse(raw);
    return `${stableJson(parsed)}\n`;
  }
  return raw.replace(/\r\n/g, '\n').replace(/\s+$/gm, '').trimEnd() + '\n';
}

export function writeMd(filePath, text) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, text.endsWith('\n') ? text : `${text}\n`);
}

export function getTruthFiles() {
  return [
    'spec/ssot.json',
    'specs/epochs/LEDGER.json',
    'specs/wow/WOW_LEDGER.json',
    'docs/RUNBOOK_RU.md'
  ].filter((p) => fs.existsSync(p));
}

export function casPutFromText(text) {
  ensureDir(CAS_DIR);
  const hash = sha256Text(text);
  const dest = path.join(CAS_DIR, `sha256-${hash}`);
  if (!fs.existsSync(dest)) fs.writeFileSync(dest, text);
  return { hash, uri: `cas://sha256:${hash}`, path: dest };
}

export function casVerify(hash) {
  const dest = path.join(CAS_DIR, `sha256-${hash}`);
  if (!fs.existsSync(dest)) return { ok: false, reason: 'missing' };
  const got = sha256File(dest);
  return { ok: got === hash, reason: got === hash ? 'ok' : `sha_mismatch:${got}` };
}

export function ensureNoLock() {
  if (!fs.existsSync(LOCK_PATH)) return;
  const info = fs.readFileSync(LOCK_PATH, 'utf8');
  throw new Error(`pipeline lock active: ${info.trim()}`);
}
