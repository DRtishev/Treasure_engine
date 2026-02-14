#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const outDir = path.resolve(process.env.RELEASE_OUT_DIR || 'artifacts/out');
fs.mkdirSync(outDir, { recursive: true });

const zipPath = path.join(outDir, 'FINAL_VALIDATED.zip');
const evidenceTarPath = path.join(outDir, 'evidence_chain.tar.gz');
const allowlistPath = path.join(outDir, 'evidence_allowlist.txt');
const excludedEpochs = new Set((process.env.RELEASE_EXCLUDE_EPOCHS || '').split(',').map((x) => x.trim()).filter(Boolean));

function run(cmd, args, input = null) {
  const out = spawnSync(cmd, args, { encoding: 'utf8', input });
  if (out.status !== 0) {
    console.error(out.stderr || out.stdout || `${cmd} failed`);
    process.exit(1);
  }
  return out;
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function listFiles(relPath) {
  const abs = path.resolve(relPath);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  function walk(cur) {
    const entries = fs.readdirSync(cur, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const e of entries) {
      const full = path.join(cur, e.name);
      if (e.isDirectory()) walk(full);
      else out.push(path.relative(process.cwd(), full));
    }
  }
  if (fs.statSync(abs).isDirectory()) walk(abs); else out.push(path.relative(process.cwd(), abs));
  return out;
}

const ledger = JSON.parse(fs.readFileSync('specs/epochs/LEDGER.json', 'utf8'));
const doneRows = Object.values(ledger.epochs ?? {})
  .filter((row) => row.stage === 'DONE' && typeof row.evidence_root === 'string');

const doneEvidenceRoots = doneRows
  .map((row) => row.evidence_root.replace(/\\/g, '/'))
  .filter((rootRel) => !excludedEpochs.has(rootRel.replace(/^reports\/evidence\//, '').replace(/\/$/, '')));

const zipInputs = [
  ...doneEvidenceRoots.flatMap((rootRel) => listFiles(rootRel)),
  ...listFiles('specs/epochs/LEDGER.json'),
  ...listFiles('specs/epochs/INDEX.md'),
  ...listFiles('docs/STAGE2_IMPLEMENTATION_MATRIX.md'),
  ...listFiles('docs/EVIDENCE_PACK_SCHEMA.md')
].sort();

for (const rel of zipInputs) {
  const abs = path.resolve(rel);
  fs.utimesSync(abs, 0, 0);
}

if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
run('zip', ['-X', '-q', '-D', '-0', zipPath, '-@'], `${zipInputs.join('\n')}\n`);

const allow = [];
for (const row of doneRows) {
  if (!row.evidence_root) continue;
  if (excludedEpochs.has(String(row.evidence_id || '').trim()) || excludedEpochs.has(String(row.id || '').trim())) continue;
  const idx = path.join(row.evidence_root, 'pack_index.json');
  if (fs.existsSync(idx)) {
    allow.push(path.join(row.evidence_root, 'pack_index.json'));
    allow.push(path.join(row.evidence_root, 'SHA256SUMS.EVIDENCE'));
    if (fs.existsSync(path.join(row.evidence_root, 'VERDICT.md'))) allow.push(path.join(row.evidence_root, 'VERDICT.md'));
  }
}
allow.sort();
fs.writeFileSync(allowlistPath, `${allow.join('\n')}\n`);

if (fs.existsSync(evidenceTarPath)) fs.unlinkSync(evidenceTarPath);
run('tar', ['--sort=name', '--mtime=@0', '--owner=0', '--group=0', '--numeric-owner', '-czf', evidenceTarPath, '-T', allowlistPath]);

const zipSha = sha256(zipPath);
const tarSha = sha256(evidenceTarPath);

fs.writeFileSync(`${zipPath}.sha256`, `${zipSha}  ${path.basename(zipPath)}\n`);
fs.writeFileSync(`${evidenceTarPath}.sha256`, `${tarSha}  ${path.basename(evidenceTarPath)}\n`);

console.log('release:build complete');
console.log(`${zipSha}  ${zipPath}`);
console.log(`${tarSha}  ${evidenceTarPath}`);
