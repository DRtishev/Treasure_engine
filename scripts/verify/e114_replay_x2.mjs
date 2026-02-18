#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text } from './e66_lib.mjs';
import { pinDirE114, writeMdAtomic } from './e114_lib.mjs';

const pin=pinDirE114();
function run(){
  const files=fs.readdirSync(path.join(pin,'normalized')).filter(f=>f.endsWith('.jsonl')).sort();
  const h=sha256Text(files.map(f=>`${f}:${sha256File(path.join(pin,'normalized',f))}`).join('\n'));
  const b=sha256File('artifacts/incoming/E114_REPLAY_BUNDLE.tar.gz');
  return {norm:h,bundle:b,manifest:sha256File('reports/evidence/E114/CAPSULE_MANIFEST.md')};
}
const a=run(), b=run(); const ok=JSON.stringify(a)===JSON.stringify(b);
writeMdAtomic('reports/evidence/E114/REPLAY_X2.md',['# E114 REPLAY X2',`- run1_norm: ${a.norm}`,`- run2_norm: ${b.norm}`,`- run1_bundle: ${a.bundle}`,`- run2_bundle: ${b.bundle}`,`- verdict: ${ok?'MATCH':'MISMATCH'}`].join('\n'));
if(!ok) throw new Error('E114_REPLAY_X2_FAIL');
console.log('e114_replay_x2: MATCH');
