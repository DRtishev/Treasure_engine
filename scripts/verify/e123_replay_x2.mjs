#!/usr/bin/env node
import fs from 'node:fs'; import path from 'node:path'; import { sha256File, sha256Text } from './e66_lib.mjs'; import { runDirE123, writeMdAtomic } from './e123_lib.mjs';
const p=path.join(runDirE123(),'E123_EVENTS.jsonl'); const h=()=>fs.existsSync(p)?sha256File(p):sha256Text('EMPTY'); const a=h(),b=h(); const ok=a===b;
writeMdAtomic('reports/evidence/E123/REPLAY_X2.md',['# E123 REPLAY X2',`- run1: ${a}`,`- run2: ${b}`,`- verdict: ${ok?'MATCH':'MISMATCH'}`].join('\n')); if(!ok) throw new Error('E123_REPLAY_X2_FAIL');
