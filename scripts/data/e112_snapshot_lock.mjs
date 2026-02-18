#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { writeMdAtomic } from '../verify/e112_lib.mjs';

const t = fs.readFileSync(path.resolve('reports/evidence/E112/SNAPSHOT_INTEGRITY.md'), 'utf8');
if (!/status:\s*PASS/.test(t)) throw new Error('E112_SNAPSHOT_LOCK_REQUIRES_INTEGRITY_PASS');
const stamp = (fs.readFileSync(path.resolve('reports/evidence/E112/CAPSULE_MANIFEST.md'), 'utf8').match(/snapshot_stamp:\s*(E112_\d+)/) || [])[1];
writeMdAtomic(path.resolve('reports/evidence/E112/SNAPSHOT_LOCK.md'), [
  '# E112 SNAPSHOT LOCK',
  `- snapshot_stamp: ${stamp}`,
  '- lock_status: IMMUTABLE_MARKER_SET',
  '- lock_path: <REPO_ROOT>/.foundation-seal/capsules/<STAMP>'
].join('\n'));
console.log(`e112_snapshot_lock: ${stamp}`);
