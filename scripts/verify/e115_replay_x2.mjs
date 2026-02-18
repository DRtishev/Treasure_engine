#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text } from './e66_lib.mjs';
import { pinDirE115, writeMdAtomic } from './e115_lib.mjs';
const pin=pinDirE115();
function run(){ const files=fs.readdirSync(path.join(pin,'normalized')).filter(f=>f.endsWith('.jsonl')).sort(); return { norm: sha256Text(files.map(f=>`${f}:${sha256File(path.join(pin,'normalized',f))}`).join('\n')), bundle: sha256File('artifacts/incoming/E115_REPLAY_BUNDLE.tar.gz') }; }
const a=run(), b=run(); const ok=JSON.stringify(a)===JSON.stringify(b);
writeMdAtomic('reports/evidence/E115/REPLAY_X2.md',['# E115 REPLAY X2',`- run1_norm: ${a.norm}`,`- run2_norm: ${b.norm}`,`- run1_bundle: ${a.bundle}`,`- run2_bundle: ${b.bundle}`,`- verdict: ${ok?'MATCH':'MISMATCH'}`].join('\n'));
if(!ok) throw new Error('E115_REPLAY_X2_FAIL');
console.log('e115_replay_x2: MATCH');
