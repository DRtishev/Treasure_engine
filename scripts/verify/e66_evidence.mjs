#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { E66_ROOT, sha256File, writeMd, ensureNoForbiddenUpdateInCI, ensureNonCIForUpdate } from './e66_lib.mjs';

ensureNoForbiddenUpdateInCI('UPDATE_E66_EVIDENCE');
ensureNonCIForUpdate('UPDATE_E66_EVIDENCE');
const update = process.env.UPDATE_E66_EVIDENCE === '1';

const required = ['VERDICT.md', 'PACK.md', 'DIFFS.md', 'PROVENANCE.md', 'RUNS_VERIFY.md', 'RUNS_X2.md', 'CAS.md', 'CLOSEOUT.md'];
const missing = required.filter((f) => !fs.existsSync(path.join(E66_ROOT, f)) || fs.readFileSync(path.join(E66_ROOT, f), 'utf8').trim() === '');
if (missing.length) {
  console.error('verify:evidence FAILED');
  for (const f of missing) console.error(`- missing ${f}`);
  process.exit(1);
}

if (update) {
  writeMd(path.join(E66_ROOT, 'CHECKLIST.md'), [
    '# E66 CHECKLIST',
    '- [x] VERDICT.md',
    '- [x] PACK.md',
    '- [x] SHA256SUMS.md',
    '- [x] DIFFS.md',
    '- [x] PROVENANCE.md',
    '- [x] RUNS_VERIFY.md',
    '- [x] RUNS_X2.md',
    '- [x] CAS.md',
    '- [x] CLOSEOUT.md',
    '- [x] CHECKLIST.md',
    '',
    'Status: COMPLETE'
  ].join('\n'));
  const updateFiles = fs.readdirSync(E66_ROOT)
    .filter((f) => f.endsWith('.md') && f !== 'SHA256SUMS.md')
    .sort();
  const updateLines = updateFiles.map((f) => `${sha256File(path.join(E66_ROOT, f))}  reports/evidence/E66/${f}`);
  writeMd(path.join(E66_ROOT, 'SHA256SUMS.md'), `# E66 SHA256SUMS\n\n${updateLines.join('\n')}`);
  console.log('verify:evidence PASSED (UPDATED)');
  process.exit(0);
}

const sumsPath = path.join(E66_ROOT, 'SHA256SUMS.md');
if (!fs.existsSync(sumsPath)) {
  console.error('verify:evidence FAILED\n- missing SHA256SUMS.md');
  process.exit(1);
}
const sumLines = fs.readFileSync(sumsPath, 'utf8').split(/\r?\n/).filter((l) => /^[a-f0-9]{64}\s{2}/.test(l));
const errs = [];
for (const l of sumLines) {
  const m = l.match(/^([a-f0-9]{64})\s{2}(.+)$/);
  if (!m) continue;
  const expected = m[1];
  const file = m[2];
  if (file.endsWith('/SHA256SUMS.md')) errs.push('SHA256SUMS.md must not self-reference');
  if (!fs.existsSync(file)) { errs.push(`missing ${file}`); continue; }
  const got = sha256File(file);
  if (got !== expected) errs.push(`sha mismatch ${file}`);
}
if (errs.length) {
  console.error('verify:evidence FAILED');
  for (const e of errs) console.error(`- ${e}`);
  process.exit(1);
}
console.log('verify:evidence PASSED');
