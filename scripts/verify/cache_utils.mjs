#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

export function sha256Text(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

export function cmdOut(bin, args) {
  const r = spawnSync(bin, args, { encoding: 'utf8' });
  return (r.stdout || '').trim();
}

export function buildCacheKey({ stage, extraFiles = [], envKeys = [] }) {
  const materials = ['spec/ssot.json', 'specs/epochs/LEDGER.json', ...extraFiles]
    .filter((p, i, a) => a.indexOf(p) === i)
    .filter((p) => fs.existsSync(p))
    .map((p) => ({ path: p, sha256: sha256File(p) }));

  const payload = {
    stage,
    materials,
    env: Object.fromEntries(envKeys.map((k) => [k, process.env[k] ?? ''])),
    node: process.version,
    npm: cmdOut('npm', ['-v'])
  };
  return { key: sha256Text(JSON.stringify(payload)), payload };
}

export function cacheRead(stage, key) {
  const base = path.resolve('.cache/phoenix', stage, key);
  const summary = path.join(base, 'summary.json');
  if (!fs.existsSync(summary)) return null;
  return { base, summary: JSON.parse(fs.readFileSync(summary, 'utf8')) };
}

export function cacheWrite(stage, key, summary, extra = {}) {
  const base = path.resolve('.cache/phoenix', stage, key);
  fs.mkdirSync(base, { recursive: true });
  fs.writeFileSync(path.join(base, 'summary.json'), `${JSON.stringify({ ...summary, ...extra }, null, 2)}\n`);
  return base;
}
