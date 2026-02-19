#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { sha256File, sha256Text } from './e66_lib.mjs';
import { runDirE134, writeMdAtomic, E134_ROOT } from './e134_lib.mjs';
import { rewriteSums } from './foundation_sums.mjs';
const p=path.join(runDirE134(),'E134_EVENTS.jsonl');
const h=()=>fs.existsSync(p)?sha256File(p):sha256Text('EMPTY');
const a=h(),b=h(),ok=a===b;
writeMdAtomic(path.join(E134_ROOT,'REPLAY_X2.md'),['# E134 REPLAY X2',`- run1: ${a}`,`- run2: ${b}`,`- verdict: ${ok?'MATCH':'MISMATCH'}`].join('\n'));
rewriteSums(E134_ROOT,['SHA256SUMS.md'],'reports/evidence');
if(!ok) throw new Error('E134_REPLAY_X2_FAIL');
