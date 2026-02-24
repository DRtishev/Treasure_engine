#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const evidenceEpoch = process.env.EVIDENCE_EPOCH || 'EPOCH-EDGE-RC-STRICT-01';
const evidenceRoot = path.join(root, 'reports/evidence', evidenceEpoch);
const artifactDir = path.join(evidenceRoot, 'artifacts');
fs.mkdirSync(artifactDir, { recursive: true });

const includeRoots = [
  'agents.md',
  'package.json',
  'package-lock.json',
  'core/edge',
  'scripts/verify',
  'scripts/export/final_validated.mjs',
  'docs/EDGE_RESEARCH',
  'docs/SDD_EDGE_EPOCHS_31_40.md',
  'specs/epochs/INDEX.md',
  'specs/epochs/LEDGER.json'
];
for (let epoch = 31; epoch <= 40; epoch += 1) includeRoots.push(`specs/epochs/EPOCH-${String(epoch).padStart(2, '0')}.md`);

const files = [];
const addPath = (rel) => {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return;
  const st = fs.statSync(abs);
  if (st.isFile()) files.push(rel);
  if (st.isDirectory()) {
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      addPath(path.join(rel, entry.name));
    }
  }
};
for (const rel of includeRoots) addPath(rel);

const sorted = Array.from(new Set(files)).sort((a, b) => a.localeCompare(b));
const listPath = path.join(artifactDir, 'FINAL_VALIDATED.filelist.txt');
fs.writeFileSync(listPath, `${sorted.join('\n')}\n`);

const archivePath = path.join(artifactDir, 'FINAL_VALIDATED.tar.gz');
const tarPath = path.join(artifactDir, 'FINAL_VALIDATED.tar');
if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
if (fs.existsSync(tarPath)) fs.unlinkSync(tarPath);

const tar = spawnSync('tar', [
  '--sort=name',
  '--mtime=UTC 2020-01-01',
  '--owner=0',
  '--group=0',
  '--numeric-owner',
  '-cf', tarPath,
  '-T', listPath
], { cwd: root, encoding: 'utf8' });
if (tar.status !== 0) throw new Error(`tar failed: ${tar.stderr || tar.stdout}`);

const gz = spawnSync('gzip', ['-n', '-f', tarPath], { cwd: root, encoding: 'utf8' });
if (gz.status !== 0) throw new Error(`gzip failed: ${gz.stderr || gz.stdout}`);

const sha = spawnSync('sha256sum', [archivePath], { cwd: root, encoding: 'utf8' });
if (sha.status !== 0) throw new Error(`sha256sum failed: ${sha.stderr || sha.stdout}`);
const digest = sha.stdout.trim().split(/\s+/)[0];
const shaPath = path.join(artifactDir, 'FINAL_VALIDATED.sha256');
fs.writeFileSync(shaPath, `${digest}  reports/evidence/${evidenceEpoch}/artifacts/FINAL_VALIDATED.tar.gz\n`);

console.log(`FINAL_VALIDATED=${path.relative(root, archivePath)}`);
console.log(`SHA256=${digest}`);
console.log(`SHA_FILE=${path.relative(root, shaPath)}`);
