#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const enforceBuild = process.env.RELEASE_BUILD === '1';
const strict = process.env.RELEASE_STRICT === '1';
const repro = process.env.RELEASE_REPRO === '1';

if (!enforceBuild && !strict && !repro) {
  console.log('verify:release SKIPPED (set RELEASE_BUILD=1 and/or RELEASE_STRICT=1 and/or RELEASE_REPRO=1)');
  process.exit(0);
}

const errors = [];
const required = [
  'artifacts/out/FINAL_VALIDATED.zip',
  'artifacts/out/FINAL_VALIDATED.zip.sha256',
  'artifacts/out/evidence_chain.tar.gz',
  'artifacts/out/evidence_chain.tar.gz.sha256',
  'artifacts/out/evidence_allowlist.txt'
];

function missingRequired() {
  return required.filter((file) => !fs.existsSync(file));
}

if (enforceBuild) {
  const missing = missingRequired();
  if (missing.length) {
    const build = spawnSync('npm', ['run', '-s', 'release:build'], { encoding: 'utf8', env: process.env });
    if (build.status !== 0) errors.push(`release:build failed: ${build.stderr || build.stdout}`);
  }
}

if (enforceBuild || repro) {
  for (const file of missingRequired()) errors.push(`missing ${file}`);
}

if (strict) {
  const ledger = JSON.parse(fs.readFileSync('specs/epochs/LEDGER.json', 'utf8'));
  for (const [epoch, row] of Object.entries(ledger.epochs ?? {})) {
    const n = Number(epoch);
    if (row.stage !== 'DONE' || Number.isNaN(n) || n < 17) continue;
    if (!row.evidence_root) {
      errors.push(`DONE epoch ${epoch} missing evidence_root`);
      continue;
    }
    const must = ['pack_index.json', 'SHA256SUMS.EVIDENCE', 'VERDICT.md', 'SUMMARY.md'];
    for (const f of must) {
      const p = `${row.evidence_root}${f}`;
      if (!fs.existsSync(p)) errors.push(`DONE epoch ${epoch} missing ${p}`);
    }
  }

  const chain = spawnSync('npm', ['run', '-s', 'verify:release:chain'], { encoding: 'utf8', env: process.env });
  if (chain.status !== 0) errors.push(`verify:release:chain failed: ${chain.stderr || chain.stdout}`);
}

function sha(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

if (repro) {
  const ledger = JSON.parse(fs.readFileSync('specs/epochs/LEDGER.json', 'utf8'));
  const doneEpochs = Object.keys(ledger.epochs ?? {}).map((k) => Number(k)).filter((n) => Number.isInteger(n) && ledger.epochs[String(n)]?.stage === 'DONE').sort((a, b) => a - b);
  const latestDone = doneEpochs.length ? `EPOCH-${String(doneEpochs[doneEpochs.length - 1]).padStart(2, '0')}` : '';
  const reproEnv = { ...process.env, RELEASE_EXCLUDE_EPOCHS: latestDone };

  const run1 = spawnSync('npm', ['run', '-s', 'release:build'], { encoding: 'utf8', env: reproEnv });
  if (run1.status !== 0) errors.push(`release:build(repro run1) failed: ${run1.stderr || run1.stdout}`);
  const before = { zip: sha('artifacts/out/FINAL_VALIDATED.zip'), tar: sha('artifacts/out/evidence_chain.tar.gz') };

  const run2 = spawnSync('npm', ['run', '-s', 'release:build'], { encoding: 'utf8', env: reproEnv });
  if (run2.status !== 0) errors.push(`release:build(repro run2) failed: ${run2.stderr || run2.stdout}`);
  const after = { zip: sha('artifacts/out/FINAL_VALIDATED.zip'), tar: sha('artifacts/out/evidence_chain.tar.gz') };

  if (before.zip !== after.zip) errors.push(`RELEASE_REPRO mismatch FINAL_VALIDATED.zip before=${before.zip} after=${after.zip}`);
  if (before.tar !== after.tar) errors.push(`RELEASE_REPRO mismatch evidence_chain.tar.gz before=${before.tar} after=${after.tar}`);
}

if (errors.length) {
  console.error('verify:release FAILED');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('verify:release PASSED');
