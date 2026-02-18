#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File } from '../verify/e66_lib.mjs';
import { E118_RUN_DIR, writeMdAtomic } from '../verify/e118_lib.mjs';
const files = fs.existsSync(E118_RUN_DIR) ? fs.readdirSync(E118_RUN_DIR).filter((f)=>f.endsWith('.jsonl')).sort().map((f)=>path.join(E118_RUN_DIR,f)) : [];
const rows = files.map((f)=>`- ${path.relative(process.cwd(),f).replace(/\\/g,'/')} | ${sha256File(f)}`);
let status='ABSENT';
if (files.length) {
  fs.mkdirSync('artifacts/incoming',{recursive:true});
  const tar = spawnSync('tar',['-czf','artifacts/incoming/E118_REPLAY_BUNDLE.tar.gz',...files.map((f)=>path.relative(process.cwd(),f))]);
  status=(tar.status??1)===0?'CREATED':'ABSENT';
}
writeMdAtomic('reports/evidence/E118/REPLAY_BUNDLE.md', ['# E118 REPLAY BUNDLE', '- file: artifacts/incoming/E118_REPLAY_BUNDLE.tar.gz', `- status: ${status}`].join('\n'));
