#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File } from '../verify/e66_lib.mjs';
import { E112_ROOT, SNAP_ROOT, modeState, writeMdAtomic, atomicWriteFile } from '../verify/e112_lib.mjs';

const mode = modeState();
const workDir = path.join(SNAP_ROOT, '_work');
const rawDir = path.join(workDir, 'raw');
const normDir = path.join(workDir, 'normalized');
if (!fs.existsSync(rawDir) || !fs.existsSync(normDir)) throw new Error('E112_WORKSET_MISSING');
const stamp = `E112_${process.env.SOURCE_DATE_EPOCH || '1700000000'}`;
const dst = path.join(SNAP_ROOT, stamp);
fs.mkdirSync(path.join(dst, 'raw'), { recursive: true });
fs.mkdirSync(path.join(dst, 'normalized'), { recursive: true });

const rows = [];
for (const f of fs.readdirSync(normDir).filter(f => f.endsWith('.jsonl')).sort()) {
  const symbol = path.basename(f, '.jsonl');
  const srcRaw = path.join(rawDir, `${symbol}.json`);
  const srcNorm = path.join(normDir, f);
  const rawBody = fs.readFileSync(srcRaw, 'utf8');
  const normBody = fs.readFileSync(srcNorm, 'utf8').replace(/\r\n/g, '\n');
  atomicWriteFile(path.join(dst, 'raw', `${symbol}.json`), rawBody);
  atomicWriteFile(path.join(dst, 'normalized', `${symbol}.jsonl`), normBody);
  rows.push({ symbol, bars: normBody.trim().split('\n').filter(Boolean).length, raw_sha256: sha256File(path.join(dst, 'raw', `${symbol}.json`)), norm_sha256: sha256File(path.join(dst, 'normalized', `${symbol}.jsonl`)) });
}
const netProofPath = path.join(E112_ROOT, 'NET_PROOF.md');
const netProofHash = fs.existsSync(netProofPath) ? sha256File(netProofPath) : 'ABSENT';
const manifestMd = [
  '# E112 CAPSULE MANIFEST',
  `- mode: ${mode}`,
  `- snapshot_stamp: ${stamp}`,
  `- snapshot_path: <REPO_ROOT>/.foundation-seal/capsules/${stamp}`,
  `- net_proof_sha256: ${netProofHash}`,
  '## Symbols',
  ...rows.map(r => `- ${r.symbol}: bars=${r.bars}, raw_sha256=${r.raw_sha256}, norm_sha256=${r.norm_sha256}`)
].join('\n');
writeMdAtomic(path.join(E112_ROOT, 'CAPSULE_MANIFEST.md'), manifestMd);
console.log(`e112_pin_snapshot: stamp=${stamp} symbols=${rows.length}`);
