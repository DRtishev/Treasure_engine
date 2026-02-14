#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E66_ROOT, SNAP_DIR, getTruthFiles, normalizeFile, sha256Text, writeMd, ensureDir } from './e66_lib.mjs';

const approve = process.env.APPROVE_SNAPSHOTS === '1';
const ci = process.env.CI === 'true';
ensureDir(SNAP_DIR);

const diffs = [];
for (const file of getTruthFiles()) {
  const normalized = normalizeFile(file);
  const hash = sha256Text(normalized);
  const snapName = `${file.replaceAll('/', '__')}.snapshot`;
  const verifiedPath = path.join(SNAP_DIR, snapName);
  const receivedPath = path.join(SNAP_DIR, `${snapName}.received`);

  if (!fs.existsSync(verifiedPath)) {
    fs.writeFileSync(receivedPath, normalized);
    diffs.push(`- ${file}: no verified snapshot (received hash ${hash})`);
    continue;
  }

  const verified = fs.readFileSync(verifiedPath, 'utf8');
  if (verified !== normalized) {
    fs.writeFileSync(receivedPath, normalized);
    diffs.push(`- ${file}: drift detected (verified ${sha256Text(verified)} != received ${hash})`);
  }
}

const diffsPath = path.join(E66_ROOT, 'DIFFS.md');
if (diffs.length === 0) {
  writeMd(diffsPath, '# E66 DIFFS\n\nNo snapshot drift detected.');
  console.log('verify:snapshots PASSED');
  process.exit(0);
}

writeMd(diffsPath, `# E66 DIFFS\n\n${diffs.join('\n')}`);

if (approve) {
  if (ci) {
    console.error('approve:snapshots FAILED: CI=true forbids approve');
    process.exit(1);
  }
  for (const file of getTruthFiles()) {
    const snapName = `${file.replaceAll('/', '__')}.snapshot`;
    const verifiedPath = path.join(SNAP_DIR, snapName);
    const receivedPath = path.join(SNAP_DIR, `${snapName}.received`);
    if (fs.existsSync(receivedPath)) fs.copyFileSync(receivedPath, verifiedPath);
  }
  console.log('approve:snapshots PASSED');
  process.exit(0);
}

console.error('verify:snapshots FAILED');
process.exit(1);
