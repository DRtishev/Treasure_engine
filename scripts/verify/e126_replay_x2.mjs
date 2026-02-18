#!/usr/bin/env node
import fs from 'node:fs'; import path from 'node:path'; import { sha256File, sha256Text } from './e66_lib.mjs'; import { runDirE126, writeMdAtomic } from './e126_lib.mjs';
const p=path.join(runDirE126(),'E126_EVENTS.jsonl'); const h=()=>fs.existsSync(p)?sha256File(p):sha256Text('EMPTY'); const a=h(),b=h(); const ok=a===b; writeMdAtomic('reports/evidence/E126/REPLAY_X2.md',['# E126 REPLAY X2',`- run1: ${a}`,`- run2: ${b}`,`- verdict: ${ok?'MATCH':'MISMATCH'}`].join('\n')); if(!ok) throw new Error('E126_REPLAY_X2_FAIL');
