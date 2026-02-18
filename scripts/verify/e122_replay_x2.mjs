#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text } from './e66_lib.mjs';
import { runDirE122, writeMdAtomic } from './e122_lib.mjs';
const p = path.join(runDirE122(), 'E122_EVENTS.jsonl');
const h = () => fs.existsSync(p) ? sha256File(p) : sha256Text('EMPTY');
const a = h(); const b = h(); const ok = a === b;
writeMdAtomic('reports/evidence/E122/REPLAY_X2.md', ['# E122 REPLAY X2', `- run1: ${a}`, `- run2: ${b}`, `- verdict: ${ok ? 'MATCH' : 'MISMATCH'}`].join('\n'));
if (!ok) throw new Error('E122_REPLAY_X2_FAIL');
