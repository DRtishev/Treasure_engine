#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const manifestPath = 'specs/repo/REPO_MANIFEST.json';
const list = spawnSync('git', ['ls-files'], { encoding: 'utf8' });
if (list.status !== 0) throw new Error(list.stderr || 'git ls-files failed');
const files = list.stdout.split(/\r?\n/).filter(Boolean).sort();

const classify = (f) => {
  if (f.startsWith('archive/') || f.startsWith('artifacts/incoming/') || f.startsWith('labs/')) return 'ARCHIVED';
  if (f.startsWith('node_modules/')) return 'VENDORED';
  if (f.startsWith('reports/evidence/') || f.endsWith('.lock')) return 'GENERATED';
  return 'ACTIVE';
};

const owner = (f) => {
  const m = f.match(/EPOCH-(\d+)/);
  return m ? `EPOCH-${String(Number(m[1])).padStart(2, '0')}` : 'prehistory';
};

const rows = files.map((f) => ({
  path: f,
  sha256: f === manifestPath ? null : crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),
  classification: classify(f),
  owner_epoch: owner(f),
  reason: classify(f) === 'GENERATED' ? 'Generated verification/release artifact tracked for reproducibility.' : classify(f) === 'ARCHIVED' ? 'Archived/quarantined content retained for historical auditability.' : 'Primary source tracked by SSOT.'
}));

const next = { schema_version: '1.0.0', generated_at: new Date().toISOString(), files: rows };

if (process.env.UPDATE_REPO_MANIFEST === '1' || !fs.existsSync(manifestPath)) {
  fs.mkdirSync('specs/repo', { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`verify:manifest UPDATED ${manifestPath}`);
  process.exit(0);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const map = new Map((manifest.files || []).map((r) => [r.path, r]));
const errors = [];
for (const f of files) {
  if (/\.(bak|backup|tmp)$/i.test(f)) errors.push(`tracked backup/temp file forbidden: ${f}`);
  const row = map.get(f);
  if (!row) {
    errors.push(`unlisted tracked file: ${f}`);
    continue;
  }
  if (f !== manifestPath) {
    const sha = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
    if (row.sha256 !== sha) errors.push(`sha256 mismatch: ${f}`);
  }
  if (!['ACTIVE', 'ARCHIVED', 'GENERATED', 'VENDORED'].includes(row.classification)) errors.push(`invalid classification for ${f}`);
  if (!row.reason || typeof row.reason !== 'string') errors.push(`missing reason for ${f}`);
}
for (const f of map.keys()) {
  if (!files.includes(f)) errors.push(`manifest contains non-tracked file: ${f}`);
}
if (errors.length) {
  console.error('verify:manifest FAILED');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('verify:manifest PASSED');
