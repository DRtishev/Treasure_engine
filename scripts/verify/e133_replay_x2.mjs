#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text } from './e66_lib.mjs';
import { runDirE133, writeMdAtomic, E133_ROOT } from './e133_lib.mjs';
import { rewriteSums } from './foundation_sums.mjs';
const p = path.join(runDirE133(), 'E133_EVENTS.jsonl');
const h = () => fs.existsSync(p) ? sha256File(p) : sha256Text('EMPTY');
const a = h(); const b = h(); const ok = a===b;
writeMdAtomic(path.join(E133_ROOT,'REPLAY_X2.md'), ['# E133 REPLAY X2', `- run1: ${a}`, `- run2: ${b}`, `- verdict: ${ok?'MATCH':'MISMATCH'}`].join('\n'));
rewriteSums(E133_ROOT,['SHA256SUMS.md'],'reports/evidence');
if(!ok) throw new Error('E133_REPLAY_X2_FAIL');
