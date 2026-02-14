#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const E66_ROOT = path.resolve('reports/evidence/E66');
export const LOCK_DIR = path.resolve('.foundation-seal');
export const LOCK_PATH = path.join(LOCK_DIR, 'E66_KILL_LOCK.md');
export const CAS_DIR = path.join(LOCK_DIR, 'cas');
export const SNAP_DIR = path.join(LOCK_DIR, 'snapshots');

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
  if (filePath.endsWith('.json')) return `${stableJson(JSON.parse(raw))}\n`;
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

export function ensureNoForbiddenUpdateInCI(updateFlag) {
  if (process.env.CI === 'true' && process.env[updateFlag] === '1') {
    throw new Error(`${updateFlag}=1 forbidden when CI=true`);
  }
}

export function ensureNonCIForUpdate(updateFlag) {
  if (process.env[updateFlag] !== '1') return;
  if (process.env.CI === 'true') throw new Error(`${updateFlag}=1 requires CI!=true`);
}

export function requireNoLock() {
  if (!fs.existsSync(LOCK_PATH)) return;
  if (process.env.CLEAR_LOCK === '1' && process.env.CI !== 'true') {
    fs.rmSync(LOCK_PATH, { force: true });
    return;
  }
  throw new Error(`kill-lock active: ${LOCK_PATH}`);
}

export function parseCasMd() {
  const casMdPath = path.join(E66_ROOT, 'CAS.md');
  if (!fs.existsSync(casMdPath)) return [];
  const lines = fs.readFileSync(casMdPath, 'utf8').split(/\r?\n/);
  const rows = [];
  for (const line of lines) {
    const m = line.match(/^-\s+(.+)\s+->\s+cas:\/\/sha256:([a-f0-9]{64})$/);
    if (m) rows.push({ path: m[1], hash: m[2] });
  }
  return rows;
}

export function evidenceFingerprint() {
  const files = [
    ['reports/evidence/E66/CAS.md', path.join(E66_ROOT, 'CAS.md')],
    ['reports/evidence/E66/PROVENANCE.md', path.join(E66_ROOT, 'PROVENANCE.md')],
    ['reports/evidence/E66/SHA256SUMS.md', path.join(E66_ROOT, 'SHA256SUMS.md')]
  ];
  const snapshots = fs.existsSync(SNAP_DIR)
    ? fs.readdirSync(SNAP_DIR)
      .filter((f) => f.endsWith('.snapshot'))
      .sort()
      .map((f) => [`.foundation-seal/snapshots/${f}`, path.join(SNAP_DIR, f)])
    : [];
  const ordered = [...files, ...snapshots];
  const chunks = [];
  for (const [id, p] of ordered) {
    if (!fs.existsSync(p)) return '';
    chunks.push(`## ${id}\n${fs.readFileSync(p, 'utf8')}`);
  }
  return sha256Text(chunks.join('\n'));
}
