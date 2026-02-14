#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E66_ROOT, SNAP_DIR, getTruthFiles, normalizeFile, sha256Text, writeMd, ensureDir, ensureNoForbiddenUpdateInCI, ensureNonCIForUpdate } from './e66_lib.mjs';

ensureNoForbiddenUpdateInCI('APPROVE_SNAPSHOTS');
ensureNonCIForUpdate('APPROVE_SNAPSHOTS');
const approve = process.env.APPROVE_SNAPSHOTS === '1';
ensureDir(SNAP_DIR);

const diffs = [];
for (const file of getTruthFiles()) {
  const normalized = normalizeFile(file);
  const hash = sha256Text(normalized);
  const snapName = `${file.replaceAll('/', '__')}.snapshot`;
  const verifiedPath = path.join(SNAP_DIR, snapName);

  if (!fs.existsSync(verifiedPath)) {
    if (approve) fs.writeFileSync(verifiedPath, normalized);
    diffs.push(`- ${file}: missing snapshot (actual ${hash})`);
    continue;
  }

  const verified = fs.readFileSync(verifiedPath, 'utf8');
  if (verified !== normalized) {
    if (approve) fs.writeFileSync(verifiedPath, normalized);
    diffs.push(`- ${file}: drift (snapshot ${sha256Text(verified)} != actual ${hash})`);
  }
}

if (approve) {
  writeMd(path.join(E66_ROOT, 'DIFFS.md'), `# E66 DIFFS\n\n${diffs.length ? diffs.join('\n') : 'No snapshot drift detected.'}`);
  console.log('approve:snapshots PASSED');
  process.exit(0);
}

if (diffs.length) {
  console.error('verify:snapshots FAILED');
  for (const d of diffs) console.error(d);
  process.exit(1);
}
console.log('verify:snapshots PASSED');
