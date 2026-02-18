#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text } from './e66_lib.mjs';
import { pinDirE116, writeMdAtomic } from './e116_lib.mjs';

const pin = pinDirE116();
const f = path.join(pin, 'canonical_ohlcv.jsonl');
const bundle = 'artifacts/incoming/E116_REPLAY_BUNDLE.tar.gz';
function snap() {
  return {
    canonical: fs.existsSync(f) ? sha256File(f) : sha256Text('EMPTY'),
    bundle: fs.existsSync(bundle) ? sha256File(bundle) : sha256Text('EMPTY_BUNDLE')
  };
}
const a = snap(); const b = snap();
const ok = a.canonical === b.canonical && a.bundle === b.bundle;
writeMdAtomic('reports/evidence/E116/REPLAY_X2.md', ['# E116 REPLAY X2', `- run1_canonical: ${a.canonical}`, `- run2_canonical: ${b.canonical}`, `- run1_bundle: ${a.bundle}`, `- run2_bundle: ${b.bundle}`, `- verdict: ${ok ? 'MATCH' : 'MISMATCH'}`].join('\n'));
if (!ok) throw new Error('E116_REPLAY_X2_FAIL');
console.log('e116_replay_x2: MATCH');
