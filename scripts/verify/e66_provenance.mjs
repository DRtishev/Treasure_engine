#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { E66_ROOT, getTruthFiles, sha256File, writeMd, ensureNoForbiddenUpdateInCI, ensureNonCIForUpdate } from './e66_lib.mjs';

ensureNoForbiddenUpdateInCI('UPDATE_PROVENANCE');
ensureNonCIForUpdate('UPDATE_PROVENANCE');
const verifyMode = process.argv.includes('--verify');
const outPath = path.join(E66_ROOT, 'PROVENANCE.md');

const git = (args) => (spawnSync('git', args, { encoding: 'utf8' }).stdout || '').trim();

if (!verifyMode || process.env.UPDATE_PROVENANCE === '1') {
  if (process.env.CI === 'true' && process.env.UPDATE_PROVENANCE !== '1' && verifyMode) {
    // verify path in CI, no writes
  } else {
    const materials = getTruthFiles().map((f) => ({ path: f, sha256: sha256File(f) }));
    const body = [
      '# E66 PROVENANCE',
      `- builder: ${process.env.CI === 'true' ? 'ci-local' : 'local'}`,
      `- commit: ${git(['rev-parse', 'HEAD'])}`,
      `- ref: ${git(['rev-parse', '--abbrev-ref', 'HEAD'])}`,
      `- ci: ${process.env.CI || ''}`,
      '',
      '## Materials',
      ...materials.map((m) => `- ${m.sha256}  ${m.path}`)
    ];
    if (process.env.UPDATE_PROVENANCE === '1') {
      writeMd(outPath, body.join('\n'));
      console.log('truth:provenance PASSED (UPDATED)');
      process.exit(0);
    }
  }
}

if (!fs.existsSync(outPath)) {
  console.error('verify:provenance FAILED\n- missing PROVENANCE.md');
  process.exit(1);
}
const lines = fs.readFileSync(outPath, 'utf8').split(/\r?\n/);
const mats = lines.filter((l) => /^- [a-f0-9]{64}  /.test(l));
const errs = [];
for (const line of mats) {
  const m = line.match(/^- ([a-f0-9]{64})  (.+)$/);
  if (!m) continue;
  const [_, expected, p] = m;
  if (!fs.existsSync(p)) errs.push(`missing material ${p}`);
  else if (sha256File(p) !== expected) errs.push(`sha mismatch ${p}`);
}
if (errs.length) {
  console.error('verify:provenance FAILED');
  for (const e of errs) console.error(`- ${e}`);
  process.exit(1);
}
console.log('verify:provenance PASSED');
