#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { ensureRunDir } from '../../core/sys/run_dir.mjs';

if (process.env.RELEASE_REPRO !== '1') {
  console.log('verify:release:repro SKIPPED (set RELEASE_REPRO=1)');
  process.exit(0);
}

const runDir = ensureRunDir('verify-release-repro');
const outRoot = path.join(runDir, 'release-repro');
const run1Dir = path.join(outRoot, 'run1');
const run2Dir = path.join(outRoot, 'run2');
fs.mkdirSync(run1Dir, { recursive: true });
fs.mkdirSync(run2Dir, { recursive: true });

function sha(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function build(targetDir) {
  const env = { ...process.env, RELEASE_OUT_DIR: targetDir };
  return spawnSync('npm', ['run', '-s', 'release:build'], { encoding: 'utf8', env });
}

const r1 = build(run1Dir);
const r2 = build(run2Dir);

const required = ['FINAL_VALIDATED.zip', 'evidence_chain.tar.gz'];
const missing = [];
for (const rel of required) {
  if (!fs.existsSync(path.join(run1Dir, rel))) missing.push(`run1/${rel}`);
  if (!fs.existsSync(path.join(run2Dir, rel))) missing.push(`run2/${rel}`);
}

const report = {
  generated_at: new Date().toISOString(),
  run_dir: path.relative(process.cwd(), outRoot),
  statuses: { run1: r1.status ?? 1, run2: r2.status ?? 1 },
  missing,
  hashes: {
    run1: {},
    run2: {}
  },
  pass: false
};

if (missing.length === 0) {
  for (const rel of required) {
    report.hashes.run1[rel] = sha(path.join(run1Dir, rel));
    report.hashes.run2[rel] = sha(path.join(run2Dir, rel));
  }
}

report.pass =
  (r1.status ?? 1) === 0 &&
  (r2.status ?? 1) === 0 &&
  missing.length === 0 &&
  report.hashes.run1['FINAL_VALIDATED.zip'] === report.hashes.run2['FINAL_VALIDATED.zip'] &&
  report.hashes.run1['evidence_chain.tar.gz'] === report.hashes.run2['evidence_chain.tar.gz'];

const reportPath = path.resolve('reports/truth/release_repro_report.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (!report.pass) {
  console.error('verify:release:repro FAILED');
  process.exit(1);
}
console.log('verify:release:repro PASSED');
