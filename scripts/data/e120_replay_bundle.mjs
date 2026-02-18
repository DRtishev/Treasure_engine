#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { runDirE120, writeMdAtomic } from '../verify/e120_lib.mjs';

const rd = runDirE120();
fs.mkdirSync(rd, { recursive: true });
const keep = ['EXECUTION_ADAPTER.md', 'LIVE_SAFETY.md', 'MICRO_LIVE_RUN.md', 'LEDGER_DAILY_REPORT.md'];
for (const f of keep) {
  const p = `reports/evidence/E120/${f}`;
  if (fs.existsSync(p)) fs.copyFileSync(p, `${rd}/${f.replace('.md', '.jsonl')}`);
}
const list = fs.readdirSync(rd).filter((f) => f.endsWith('.jsonl')).sort();
let status = 'ABSENT';
if (list.length) {
  fs.mkdirSync('artifacts/incoming', { recursive: true });
  const tar = spawnSync('tar', ['-czf', 'artifacts/incoming/E120_REPLAY_BUNDLE.tar.gz', ...list.map((f) => `${rd}/${f}`)]);
  status = (tar.status ?? 1) === 0 ? 'CREATED' : 'ABSENT';
}
writeMdAtomic('reports/evidence/E120/REPLAY_BUNDLE.md', ['# E120 REPLAY BUNDLE', '- file: artifacts/incoming/E120_REPLAY_BUNDLE.tar.gz', `- status: ${status}`].join('\n'));
