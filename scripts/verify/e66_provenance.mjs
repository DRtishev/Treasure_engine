#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { E66_ROOT, getTruthFiles, sha256File, writeMd } from './e66_lib.mjs';

const verifyMode = process.argv.includes('--verify');
const outPath = path.join(E66_ROOT, 'PROVENANCE.md');

function git(args) {
  return (spawnSync('git', args, { encoding: 'utf8' }).stdout || '').trim();
}

if (!verifyMode) {
  const materials = getTruthFiles().map((f) => ({ path: f, sha256: sha256File(f) }));
  const body = [
    '# E66 PROVENANCE',
    `- builder: ${process.env.CI === 'true' ? 'ci-local' : 'local'}`,
    `- commit: ${git(['rev-parse', 'HEAD'])}`,
    `- ref: ${git(['rev-parse', '--abbrev-ref', 'HEAD'])}`,
    `- ci: ${process.env.CI || ''}`,
    '',
    '## Materials'
  ];
  for (const m of materials) body.push(`- ${m.sha256}  ${m.path}`);
  writeMd(outPath, body.join('\n'));
  console.log('truth:provenance PASSED');
  process.exit(0);
}

if (!fs.existsSync(outPath)) {
  console.error('verify:provenance FAILED\n- missing PROVENANCE.md');
  process.exit(1);
}
const lines = fs.readFileSync(outPath, 'utf8').split(/\r?\n/);
const materialLines = lines.filter((l) => /^- [a-f0-9]{64}  /.test(l));
const errs = [];
for (const line of materialLines) {
  const m = line.match(/^- ([a-f0-9]{64})  (.+)$/);
  if (!m) continue;
  const expected = m[1];
  const p = m[2];
  if (!fs.existsSync(p)) {
    errs.push(`missing material ${p}`);
    continue;
  }
  const got = sha256File(p);
  if (got !== expected) errs.push(`sha mismatch ${p}`);
}
if (errs.length > 0) {
  console.error('verify:provenance FAILED');
  for (const e of errs) console.error(`- ${e}`);
  process.exit(1);
}
console.log('verify:provenance PASSED');
