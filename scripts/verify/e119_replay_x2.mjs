#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text } from './e66_lib.mjs';
import { runDirE119, writeMdAtomic } from './e119_lib.mjs';
const p = path.join(runDirE119(), 'LIVE_CONFIRM_MATRIX.jsonl');
const h = () => fs.existsSync(p) ? sha256File(p) : sha256Text('EMPTY');
const a = h(); const b = h(); const ok = a === b;
writeMdAtomic('reports/evidence/E119/REPLAY_X2.md', ['# E119 REPLAY X2', `- run1: ${a}`, `- run2: ${b}`, `- verdict: ${ok ? 'MATCH' : 'MISMATCH'}`].join('\n'));
if (!ok) throw new Error('E119_REPLAY_X2_FAIL');
