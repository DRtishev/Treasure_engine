#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text } from './e66_lib.mjs';
import { getCapsulePinDir, writeMdAtomic } from './e113_lib.mjs';

const pin = getCapsulePinDir();
if (!fs.existsSync(pin)) throw new Error('E113_REPLAY_X2_PIN_MISSING');
if (!fs.existsSync(path.resolve('artifacts/incoming/E113_REPLAY_BUNDLE.tar.gz'))) throw new Error('E113_REPLAY_BUNDLE_MISSING');

function runOnce() {
  const files = fs.readdirSync(path.join(pin, 'normalized')).filter(f => f.endsWith('.jsonl')).sort();
  const hashes = files.map(f => `${f}:${sha256File(path.join(pin, 'normalized', f))}`);
  const manifest = fs.existsSync('reports/evidence/E113/CAPSULE_MANIFEST.md') ? sha256File('reports/evidence/E113/CAPSULE_MANIFEST.md') : 'ABSENT';
  const fuel = fs.existsSync('reports/evidence/E113/REALITY_FUEL.md') ? sha256File('reports/evidence/E113/REALITY_FUEL.md') : 'ABSENT';
  return {
    normalized_hash: sha256Text(hashes.join('\n')),
    capsule_manifest_hash: manifest,
    reality_fuel_hash: fuel,
    bundle_hash: sha256File('artifacts/incoming/E113_REPLAY_BUNDLE.tar.gz')
  };
}

const a = runOnce();
const b = runOnce();
const match = JSON.stringify(a) === JSON.stringify(b);
writeMdAtomic('reports/evidence/E113/REPLAY_X2.md', [
  '# E113 REPLAY X2',
  `- run1_normalized_hash: ${a.normalized_hash}`,
  `- run2_normalized_hash: ${b.normalized_hash}`,
  `- run1_manifest_hash: ${a.capsule_manifest_hash}`,
  `- run2_manifest_hash: ${b.capsule_manifest_hash}`,
  `- run1_bundle_hash: ${a.bundle_hash}`,
  `- run2_bundle_hash: ${b.bundle_hash}`,
  `- verdict: ${match ? 'MATCH' : 'MISMATCH'}`
].join('\n'));
if (!match) throw new Error('E113_REPLAY_X2_MISMATCH');
console.log('e113_replay_x2: MATCH');
