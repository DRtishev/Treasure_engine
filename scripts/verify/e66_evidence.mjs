#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E66_ROOT, writeMd, sha256File } from './e66_lib.mjs';

const required = ['VERDICT.md', 'PACK.md', 'DIFFS.md', 'PROVENANCE.md', 'CHECKLIST.md', 'RUNS.md'];
const missing = required.filter((f) => !fs.existsSync(path.join(E66_ROOT, f)) || fs.readFileSync(path.join(E66_ROOT, f), 'utf8').trim().length === 0);
if (missing.length > 0) {
  console.error('verify:evidence FAILED');
  for (const m of missing) console.error(`- missing ${m}`);
  process.exit(1);
}

const mdFiles = fs.readdirSync(E66_ROOT).filter((f) => f.endsWith('.md')).sort();
const lines = mdFiles.map((f) => `${sha256File(path.join(E66_ROOT, f))}  reports/evidence/E66/${f}`);
writeMd(path.join(E66_ROOT, 'SHA256SUMS.md'), `# E66 SHA256SUMS\n\n${lines.join('\n')}`);

const checklist = [
  '# E66 CHECKLIST',
  '- [x] VERDICT.md',
  '- [x] PACK.md',
  '- [x] SHA256SUMS.md',
  '- [x] DIFFS.md',
  '- [x] PROVENANCE.md',
  '- [x] RUNS.md',
  '- [x] CHECKLIST.md',
  '',
  'Status: COMPLETE'
];
writeMd(path.join(E66_ROOT, 'CHECKLIST.md'), checklist.join('\n'));

console.log('verify:evidence PASSED');
