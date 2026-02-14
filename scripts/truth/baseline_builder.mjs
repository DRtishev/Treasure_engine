#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function npmVersion() {
  try {
    return execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}


const requiredArtifacts = ['artifacts/out/FINAL_VALIDATED.zip', 'artifacts/out/evidence_chain.tar.gz'];
for (const file of requiredArtifacts) {
  if (!fs.existsSync(file)) {
    console.error(`baseline_builder missing required artifact: ${file}`);
    process.exit(1);
  }
}

const ledger = readJson('specs/epochs/LEDGER.json');
const wow = readJson('specs/wow/WOW_LEDGER.json');
const manifest = readJson('specs/repo/REPO_MANIFEST.json');

const packIndexSample = (() => {
  const done = Object.entries(ledger.epochs ?? {})
    .map(([k, row]) => ({ epoch: Number(k), row }))
    .filter(({ epoch, row }) => Number.isInteger(epoch) && row?.stage === 'DONE' && typeof row?.evidence_root === 'string')
    .sort((a, b) => b.epoch - a.epoch);
  for (const item of done) {
    const p = path.join(item.row.evidence_root, 'pack_index.json');
    if (fs.existsSync(p)) return { file: p, json: readJson(p) };
  }
  return null;
})();

const allowlistPath = path.resolve('artifacts/out/evidence_allowlist.txt');
const allowlistCount = fs.existsSync(allowlistPath)
  ? fs.readFileSync(allowlistPath, 'utf8').split(/\r?\n/).map((x) => x.trim()).filter(Boolean).length
  : 0;

const baseline = {
  node_version: process.version,
  npm_version: npmVersion(),
  release_hashes: {
    final_validated_zip_sha256: sha256('artifacts/out/FINAL_VALIDATED.zip'),
    evidence_chain_tar_sha256: sha256('artifacts/out/evidence_chain.tar.gz')
  },
  counts: {
    done_epochs: Object.values(ledger.epochs ?? {}).filter((row) => row?.stage === 'DONE').length,
    allowlist_size: allowlistCount
  },
  schema_versions: {
    ledger: ledger.schema_version ?? null,
    wow: wow.schema_version ?? wow.version ?? null,
    manifest: manifest.schema_version ?? null,
    pack_index: packIndexSample?.json?.schema_version ?? packIndexSample?.json?.version ?? null
  },
  pack_index_source: packIndexSample?.file ?? null
};

const outPath = path.resolve('truth/BASELINE.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(baseline, null, 2)}\n`);
console.log(path.relative(process.cwd(), outPath));
