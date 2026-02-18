#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text } from './e66_lib.mjs';
import { runDirE128, writeMdAtomic, E128_ROOT } from './e128_lib.mjs';
import { rewriteSums } from './foundation_sums.mjs';
const p=path.join(runDirE128(),'E128_EVENTS.jsonl');
const h=()=>fs.existsSync(p)?sha256File(p):sha256Text('EMPTY');
const a=h(), b=h(), ok=a===b;
writeMdAtomic('reports/evidence/E128/REPLAY_X2.md',['# E128 REPLAY X2',`- run1: ${a}`,`- run2: ${b}`,`- verdict: ${ok?'MATCH':'MISMATCH'}`].join('\n'));
rewriteSums(E128_ROOT,['SHA256SUMS.md'],'reports/evidence');
if(!ok) throw new Error('E128_REPLAY_X2_FAIL');
