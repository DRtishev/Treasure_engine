#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const outPath = path.resolve('truth/PROVENANCE.json');
const materialsList = ['spec/ssot.json', 'specs/epochs/LEDGER.json', 'truth/BASELINE.json'].filter((p) => fs.existsSync(p));
const sha256 = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const cmd = (c, a) => (spawnSync(c, a, { encoding: 'utf8' }).stdout || '').trim();

const outputs = ['artifacts/out/FINAL_VALIDATED.zip', 'artifacts/out/evidence_chain.tar.gz'].filter((p) => fs.existsSync(p));
const doc = {
  schema_version: '1.0.0',
  buildType: 'treasure-engine/slsa-lite@v1',
  commit_sha: cmd('git', ['rev-parse', 'HEAD']),
  node: process.version,
  npm: cmd('npm', ['-v']),
  ci: { CI: process.env.CI === 'true' ? 'true' : String(process.env.CI || ''), RELEASE_STRICT: String(process.env.RELEASE_STRICT || ''), RELEASE_BUILD: String(process.env.RELEASE_BUILD || '') },
  materials: materialsList.map((p) => ({ path: p, sha256: sha256(p) })),
  outputs: outputs.map((p) => ({ path: p, sha256: sha256(p) }))
};

const chainPath = 'artifacts/out/evidence_chain.tar.gz';
if (fs.existsSync(chainPath)) doc.evidence_chain_sha256 = sha256(chainPath);
fs.writeFileSync(outPath, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`truth:provenance wrote ${path.relative(process.cwd(), outPath)}`);
