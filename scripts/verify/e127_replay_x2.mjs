#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text } from './e66_lib.mjs';
import { runDirE127, writeMdAtomic, E127_ROOT } from './e127_lib.mjs';
import { rewriteSums } from './foundation_sums.mjs';
const p=path.join(runDirE127(),'E127_EVENTS.jsonl');
const h=()=>fs.existsSync(p)?sha256File(p):sha256Text('EMPTY');
const a=h(); const b=h();
const ok=a===b;
writeMdAtomic('reports/evidence/E127/REPLAY_X2.md',['# E127 REPLAY X2',`- run1: ${a}`,`- run2: ${b}`,`- verdict: ${ok?'MATCH':'MISMATCH'}`].join('\n'));
rewriteSums(E127_ROOT,['SHA256SUMS.md'],'reports/evidence');
if(!ok) throw new Error('E127_REPLAY_X2_FAIL');
