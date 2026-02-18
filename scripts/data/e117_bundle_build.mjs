#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File } from '../verify/e66_lib.mjs';
import { runDirE117, writeMdAtomic } from '../verify/e117_lib.mjs';

const runDir = runDirE117();
const wsDir = path.join(runDir, 'ws');
const files = fs.existsSync(wsDir) ? fs.readdirSync(wsDir).filter((f) => f.endsWith('.jsonl') || f.endsWith('.md')).sort().map((f) => path.join(wsDir, f)) : [];
const rows = files.map((f) => `- ${path.relative(process.cwd(), f).replace(/\\/g, '/')} | ${sha256File(f)}`);
writeMdAtomic('reports/evidence/E117/REPLAY_BUNDLE_MANIFEST.md', ['# E117 REPLAY BUNDLE MANIFEST', ...rows].join('\n'));
let bundleStatus = 'ABSENT';
const tarPath = path.resolve('artifacts/incoming/E117_REPLAY_BUNDLE.tar.gz');
if (files.length) {
  fs.mkdirSync(path.dirname(tarPath), { recursive: true });
  const rel = files.map((f) => path.relative(process.cwd(), f).replace(/\\/g, '/'));
  const tar = spawnSync('tar', ['-czf', tarPath, ...rel], { encoding: 'utf8' });
  bundleStatus = (tar.status ?? 1) === 0 ? 'CREATED' : 'ABSENT';
}
writeMdAtomic('reports/evidence/E117/REPLAY_BUNDLE.md', ['# E117 REPLAY BUNDLE', `- file: artifacts/incoming/E117_REPLAY_BUNDLE.tar.gz`, `- status: ${bundleStatus}`].join('\n'));
console.log('e117_bundle_build done');
