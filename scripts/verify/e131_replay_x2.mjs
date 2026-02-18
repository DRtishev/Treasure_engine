#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text } from './e66_lib.mjs';
import { runDirE131, writeMdAtomic, E131_ROOT } from './e131_lib.mjs';
import { rewriteSums } from './foundation_sums.mjs';

const p = path.join(runDirE131(), 'E131_EVENTS.jsonl');
const h = () => fs.existsSync(p) ? sha256File(p) : sha256Text('EMPTY');
const a = h();
const b = h();
const ok = a === b;
writeMdAtomic(path.join(E131_ROOT, 'REPLAY_X2.md'), ['# E131 REPLAY X2', `- run1: ${a}`, `- run2: ${b}`, `- verdict: ${ok ? 'MATCH' : 'MISMATCH'}`].join('\n'));
rewriteSums(E131_ROOT, ['SHA256SUMS.md'], 'reports/evidence');
if (!ok) throw new Error('E131_REPLAY_X2_FAIL');
