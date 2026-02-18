#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E118_RUN_DIR } from '../verify/e118_lib.mjs';
const ws = path.join(E118_RUN_DIR, 'ws_live.jsonl');
const out = path.join(E118_RUN_DIR, 'replay_ohlcv.jsonl');
const rows = fs.existsSync(ws) ? fs.readFileSync(ws, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).sort((a,b)=>a.ts-b.ts) : [];
if (rows.length) fs.writeFileSync(out, `${rows.map((r)=>JSON.stringify(r)).join('\n')}\n`, 'utf8');
