#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File } from '../verify/e66_lib.mjs';
import { SNAP_ROOT, writeMdAtomic } from '../verify/e112_lib.mjs';

const manifest = fs.readFileSync(path.resolve('reports/evidence/E112/CAPSULE_MANIFEST.md'), 'utf8');
const stamp = (manifest.match(/snapshot_stamp:\s*(E112_\d+)/) || [])[1];
if (!stamp) throw new Error('E112_MANIFEST_STAMP_MISSING');
const root = path.join(SNAP_ROOT, stamp);
const reasons = [];
const symbols = [...manifest.matchAll(/- ([A-Z0-9]+USDT): bars=(\d+), raw_sha256=([a-f0-9]{64}), norm_sha256=([a-f0-9]{64})/g)];
for (const m of symbols) {
  const [_, sym, _bars, rawHash, normHash] = m;
  const rp = path.join(root, 'raw', `${sym}.json`);
  const np = path.join(root, 'normalized', `${sym}.jsonl`);
  if (!fs.existsSync(rp) || !fs.existsSync(np)) { reasons.push(`${sym}:MISSING_FILE`); continue; }
  if (sha256File(rp) !== rawHash) reasons.push(`${sym}:RAW_HASH_MISMATCH`);
  if (sha256File(np) !== normHash) reasons.push(`${sym}:NORM_HASH_MISMATCH`);
  const body = fs.readFileSync(np, 'utf8');
  if (/\r\n/.test(body)) reasons.push(`${sym}:NON_LF`);
}
const temps = fs.readdirSync(path.join(root, 'normalized')).filter(f => f.includes('.tmp'));
if (temps.length) reasons.push(`TEMP_FILES_PRESENT:${temps.join(',')}`);
const pass = reasons.length === 0;
writeMdAtomic(path.resolve('reports/evidence/E112/SNAPSHOT_INTEGRITY.md'), [
  '# E112 SNAPSHOT INTEGRITY',
  `- snapshot_stamp: ${stamp}`,
  `- status: ${pass ? 'PASS' : 'FAIL'}`,
  '## Reasons',
  ...(pass ? ['- NONE'] : reasons.map(r => `- ${r}`))
].join('\n'));
if (!pass) throw new Error('E112_SNAPSHOT_INTEGRITY_FAIL');
console.log(`e112_snapshot_integrity_contract: PASS stamp=${stamp}`);
