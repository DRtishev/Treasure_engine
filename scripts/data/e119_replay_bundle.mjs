#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runDirE119, writeMdAtomic } from '../verify/e119_lib.mjs';

const rd = runDirE119();
fs.mkdirSync(rd, { recursive: true });
const src = ['reports/evidence/E119/QUORUM_WINDOWS.md', 'reports/evidence/E119/LIVE_CONFIRM_MATRIX.md'];
for (const p of src) if (fs.existsSync(p)) fs.copyFileSync(p, path.join(rd, path.basename(p).replace('.md', '.jsonl')));
const rows = fs.readdirSync(rd).filter((f) => f.endsWith('.jsonl')).sort();
let status = 'ABSENT';
if (rows.length) {
  fs.mkdirSync('artifacts/incoming', { recursive: true });
  const tar = spawnSync('tar', ['-czf', 'artifacts/incoming/E119_REPLAY_BUNDLE.tar.gz', ...rows.map((f) => path.join(rd, f))]);
  status = (tar.status ?? 1) === 0 ? 'CREATED' : 'ABSENT';
}
writeMdAtomic('reports/evidence/E119/REPLAY_BUNDLE.md', ['# E119 REPLAY BUNDLE', '- file: artifacts/incoming/E119_REPLAY_BUNDLE.tar.gz', `- status: ${status}`].join('\n'));
