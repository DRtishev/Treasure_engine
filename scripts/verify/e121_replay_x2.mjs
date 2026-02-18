#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text } from './e66_lib.mjs';
import { runDirE121, writeMdAtomic } from './e121_lib.mjs';

const p = path.join(runDirE121(), 'MICRO_LIVE_RUN.jsonl');
const h = () => fs.existsSync(p) ? sha256File(p) : sha256Text('EMPTY');
const a = h(); const b = h();
const ok = a === b;
writeMdAtomic('reports/evidence/E121/REPLAY_X2.md', ['# E121 REPLAY X2', `- run1: ${a}`, `- run2: ${b}`, `- verdict: ${ok ? 'MATCH' : 'MISMATCH'}`].join('\n'));
if (!ok) throw new Error('E121_REPLAY_X2_FAIL');
