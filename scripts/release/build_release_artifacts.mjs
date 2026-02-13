#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const outDir = path.resolve('artifacts/out');
fs.mkdirSync(outDir, { recursive: true });

const zipPath = path.join(outDir, 'FINAL_VALIDATED.zip');
const evidenceTarPath = path.join(outDir, 'evidence_chain.tar.gz');
const allowlistPath = path.join(outDir, 'evidence_allowlist.txt');

const zip = spawnSync('zip', ['-rq', zipPath, 'reports/evidence', 'specs/epochs/LEDGER.json', 'specs/epochs/INDEX.md', 'docs/STAGE2_IMPLEMENTATION_MATRIX.md', 'docs/EVIDENCE_PACK_SCHEMA.md'], { encoding: 'utf8' });
if (zip.status !== 0) {
  console.error(zip.stderr || zip.stdout || 'zip failed');
  process.exit(1);
}

const ledger = JSON.parse(fs.readFileSync('specs/epochs/LEDGER.json', 'utf8'));
const allow = [];
for (const row of Object.values(ledger.epochs ?? {})) {
  if (row.status !== 'DONE' || !row.evidence_root) continue;
  const idx = path.join(row.evidence_root, 'pack_index.json');
  if (fs.existsSync(idx)) {
    allow.push(path.join(row.evidence_root, 'pack_index.json'));
    allow.push(path.join(row.evidence_root, 'SHA256SUMS.EVIDENCE'));
    if (fs.existsSync(path.join(row.evidence_root, 'VERDICT.md'))) {
      allow.push(path.join(row.evidence_root, 'VERDICT.md'));
    }
  }
}
allow.sort();
fs.writeFileSync(allowlistPath, `${allow.join('\n')}\n`);

const tar = spawnSync('tar', ['-czf', evidenceTarPath, '--files-from', allowlistPath], { encoding: 'utf8' });
if (tar.status !== 0) {
  console.error(tar.stderr || tar.stdout || 'tar failed');
  process.exit(1);
}

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const zipSha = sha256(zipPath);
const tarSha = sha256(evidenceTarPath);

fs.writeFileSync(`${zipPath}.sha256`, `${zipSha}  ${path.basename(zipPath)}\n`);
fs.writeFileSync(`${evidenceTarPath}.sha256`, `${tarSha}  ${path.basename(evidenceTarPath)}\n`);

console.log('release:build complete');
console.log(`${zipSha}  ${zipPath}`);
console.log(`${tarSha}  ${evidenceTarPath}`);
