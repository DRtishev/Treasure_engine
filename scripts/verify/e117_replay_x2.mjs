#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text } from './e66_lib.mjs';
import { runDirE117, writeMdAtomic } from './e117_lib.mjs';

const p = path.join(runDirE117(), 'ws', 'replay_ohlcv.jsonl');
const hash = () => fs.existsSync(p) ? sha256File(p) : sha256Text('EMPTY');
const a = hash(); const b = hash();
const ok = a === b;
writeMdAtomic('reports/evidence/E117/REPLAY_X2.md', ['# E117 REPLAY X2', `- run1: ${a}`, `- run2: ${b}`, `- verdict: ${ok ? 'MATCH' : 'MISMATCH'}`].join('\n'));
if (!ok) throw new Error('E117_REPLAY_X2_FAIL');
console.log('e117_replay_x2: MATCH');
